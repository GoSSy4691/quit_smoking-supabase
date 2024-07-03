import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.177.1/http/server.ts"

serve(async (req: Request) => {
  try {
    // get access token
    const token = req.headers.get('Authorization');
    if (!token) {
      return jsonResponse({ 
        result: false,
        error: "access token is missing or invalid" 
      }, 401);
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

    // check method
    if (req.method !== "DELETE") {
      return jsonResponse({ 
        result: false, 
        error: "invalid request method" 
      }, 405);
    }

    // get user data
    const { dataUser, errorUser } = await supabaseClient.auth.getUser();
    if (errorUser || !dataUser.user) {
      return jsonResponse({ 
        result: false, 
        error: "unauthorized user"
      }, 401);
    }
    const userId = dataUser.user.id;

    const { errorRmv } = await supabaseAdminClient.auth.admin.deleteUser(userId);
    if (errorRmv) {
      return jsonResponse({ 
        result: false, 
        error: "internal user error for deleting user",
        // error: errorRmv // debug
      }, 500);
    }

    return jsonResponse({
      result: true, 
      userId: userId  
    }, 200);
  } catch (error) {
    console.error("An error occurred:", error.message);
    return jsonResponse({ 
      result: false, 
      error: "internal error"
    }, 500);
  }
});

function jsonResponse(body: Record<string, any>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}
