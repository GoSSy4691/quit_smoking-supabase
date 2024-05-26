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

    if (req.method !== 'POST') {
      return jsonResponse({ 
        result: false, 
        error: "invalid request method" 
      }, 405);
    }

    // connect to supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: token } } }
    );

    // get user data
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) {
      return jsonResponse({ 
        result: false, 
        error: "unauthorized user"
      }, 401);
    }
    const userId = data.user.id;

    const text = await req.text();
    const { niko } = JSON.parse(text);
    if (!niko) {
      return jsonResponse({ 
        result: false, 
        error: "niko is missing in request body"
      }, 400);
    }

    const result = {
      niko: niko
    }

    // Check if user exists
    const { data: userData, error: userError } = await supabaseClient
    .from('users')
    .select('uid')
    .eq('uid', userId)
    .single();
    if (userError || !userData) {
      return jsonResponse({ 
        result: false, 
        error: 'user not found: ' + userId
      }, 404);
    }

    // new data into the database
    const updateResult = await supabaseClient
    .from('users')
    .update(result)
    .eq('uid', userId);
    if (updateResult.error) {
      console.error('Error updating data:', updateResult.error);
      return jsonResponse({ 
        result: false, 
        error: "error updating data",
        //message: updateResult.error // debug
      }, 500);
    }

    return jsonResponse({ result: true, message: "data added successfully", body: result }, 200);
  } catch (error) {
    console.error("An error occurred:", error.message);
    return jsonResponse({ 
      result: false, 
      error: "internal error",
      //message: error.message // debug
    }, 500);
  }
});

function jsonResponse(body: Record<string, any>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}
