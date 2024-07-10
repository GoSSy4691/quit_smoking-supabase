import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.177.1/http/server.ts"

serve(async (req: Request) => {
  try {
    // get access token
    const token = req.headers.get("Authorization");
    if (token) {
      return jsonResponse({ 
        result: false,
        error: "you already have access token" 
      }, 401);
    }

    // check method
    if (req.method !== "GET") {
      return jsonResponse({ 
        result: false, 
        error: "invalid request method" 
      }, 405);
    }

    // connect to supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: token } } }
    );
    
    // create new user
    const newUserEmail = `temp_user_${generateRandomNumber()}@mail.com`;
    const password = generateRandomPassword()
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: newUserEmail,
        password: password,
      })
      if (signUpError) {
        return jsonResponse({ 
          result: false, 
          error: "internal user error for creating user",
          // errorMessage: signUpError // debug
        }, 500);
      }
      const { access_token, refresh_token, user, expires_at } = signUpData.session;

      return jsonResponse({
        result: true,
        message: "user created successfully",
        access_token: access_token,
        refresh_token: refresh_token,
        user: user,
        generated_password: password,
        expires_at: expires_at
      }, 200);


  } catch (error) {
    console.error("An error occurred:", error.message);
    return jsonResponse({ 
      result: false, 
      error: "internal error",
      // message: error.message // debug
    }, 500);
  }

  return jsonResponse({ 
    result: false, 
    error: "null",
  }, 500);
});

function jsonResponse(body: Record<string, any>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const generateRandomPassword = (length = 12) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let password = ""
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    password += chars[randomIndex]
  }
  return password
}

function generateRandomNumber() {
  return (Math.random()+' ').substring(2,10)+(Math.random()+' ').substring(2,10);
}
