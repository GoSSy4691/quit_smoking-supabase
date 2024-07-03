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
    if (req.method !== "POST") {
      return jsonResponse({ 
        result: false, 
        error: "invalid request method" 
      }, 405);
    }

    // connect to supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: token } } }
    );
    const supabaseAdminClient = createClient(
      supabaseUrl, 
      supabaseServiceRoleKey
    );

    // collect data from req
    const text = await req.text();
    const { email, name, auth_id, provider } = JSON.parse(text);
    if (!email) {
      return jsonResponse({ 
        result: false, 
        error: "email is missing in request body"
      }, 400);
    }
    if (!auth_id) {
      return jsonResponse({ 
        result: false, 
        error: "auth_id is missing in request body"
      }, 400);
    }
    if (!provider) {
      return jsonResponse({ 
        result: false, 
        error: "provider is missing in request body"
      }, 400);
    }

    // find out what kind of provider
    let isGoogle = null;
    if (provider === "google") {
      isGoogle = true;
    } else if (provider === "apple") {
      isGoogle = false;
    } else {
      return jsonResponse({ 
        result: false, 
        error: "unknown provider"
      }, 400);
    }
    
    // try find exist user
    let isNewbee = null;
    let { data: userData, error: userError } = await supabaseAdminClient
    .from("oath")
    .select("uid")
    .eq(isGoogle ? "aidGoogle" : "aidApple", auth_id)
    .single();
    if (userError && userError.code === "PGRST116") { // PGRST116 === user is not found     
      isNewbee = true;
    } else if (userError) {
      return jsonResponse({ 
        result: false, 
        error: "internal user error for searching user",
        // errorMessage: userError // debug
      }, 500);
    } else {
      isNewbee = false;
    }

    // double check
    if (isNewbee === null) {
      return jsonResponse({ 
        result: false, 
        error: "internal user error after searching user",
      }, 500);
    }

    // for new user
    if (isNewbee === true) {
      const password = generateRandomPassword()
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: email,
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

      // init data to db
      const insertData = {
        uid: user.id,
        aidGoogle: isGoogle ? auth_id : "",
        aidApple: isGoogle ? "" : auth_id
      }

      // new data into the database
      const updateResult = await supabaseAdminClient
      .from("oath")
      .insert(insertData);
      if (updateResult.error) {
        // rmv user
        const { error: deleteUserError } = await supabaseAdminClient.auth.admin.deleteUser(user.id);
        if (deleteUserError) {
          console.error("error deleting user:", deleteUserError);
          return jsonResponse({
            result: false,
            error: "error updating data and error deleting user",
            // message: updateResult.error, // debug
            // deleteErrorMessage: deleteUserError // debug
          }, 500);
        }

        return jsonResponse({ 
          result: false, 
          error: "error inserting data",
          // message: updateResult.error // debug
        }, 500);
      }

      return jsonResponse({
        result: true,
        message: "user created successfully",
        access_token: access_token,
        refresh_token: refresh_token,
        user: user,
        generated_password: password,
        expires_at: expires_at
      }, 200);
    }
    
    if (isNewbee === false) {
      // User already exists, send a magicLink to email
      const { dataOtp, errorOtp } = await supabaseClient.auth.signInWithOtp({
        email: email,
      });
      if (errorOtp) {
        return jsonResponse({
          result: false,
          error: "error sending otp to email: " + email
        }, 500);
      }

      return jsonResponse({
        result: true,
        otp: true,
        message: "send otp successfully",
      }, 200);
    }


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
