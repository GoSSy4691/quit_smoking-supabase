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

    // get data
    const text = await req.text();
    const { is_ready, user_name, user_text } = JSON.parse(text);
    if (!user_text) {
      return jsonResponse({ 
        result: false, 
        error: "user_text is missing in request body"
      }, 400);
    }
    if (is_ready && typeof is_ready !== 'boolean') {
      return jsonResponse({ 
        result: false, 
        error: "is_ready is not boolean"
      }, 400);
    }

    const dateNow = new Date();
    const dateTimestamp = dateNow.getTime();
    const formattedDateNow = `${('0' + dateNow.getDate()).slice(-2)}.${('0' + (dateNow.getMonth() + 1)).slice(-2)}.${dateNow.getFullYear()}`;

    const result = { 
      date: formattedDateNow,
      uid: userId,
      isReady: is_ready ?? false,
      name: user_name ?? "Анонимный пользователь",
      text: user_text,
      date_timestamp: dateTimestamp
    }

    // new data into the database
    const insertResult = await supabaseClient
    .from('historys')
    .insert(result);
    if (insertResult.error) {
      console.error('Error inserting data:', insertResult.error);
      return jsonResponse({ 
        result: false, 
        error: "error inserting data",
        //message: insertResult.error // debug
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
