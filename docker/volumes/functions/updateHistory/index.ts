import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.177.1/http/server.ts"

interface HistoryDetails {
  date: any,
  date_timestamp: any,
  text?: string,
  isReady?: boolean,
  name?: string;
}

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

    // check method
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

    // check user data
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) {
      return jsonResponse({ 
        result: false, 
        error: "unauthorized user"
      }, 401);
    }

    // get data
    const text = await req.text();
    const { history_id, is_ready, user_name, user_text } = JSON.parse(text);
    if (!history_id) {
      return jsonResponse({ 
        result: false, 
        error: "history_id is missing in request body"
      }, 400);
    }
    if (!is_ready && !user_name && !user_text) {
      return jsonResponse({ 
        result: false, 
        error: "some data is missing in request body"
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

    const result: HistoryDetails = { 
      date: formattedDateNow,
      date_timestamp: dateTimestamp
    }
    if (user_text) {
      result.text = user_text;
    }
    if (is_ready === true || is_ready === false) {
      result.isReady = is_ready;
    }
    if (user_name) {
      result.name = user_name;
    }

    // new data into the database
    const insertResult = await supabaseClient
    .from('historys')
    .update(result)
    .eq('id', history_id);
    if (insertResult.error) {
      console.error('Error updating data:', insertResult.error);
      return jsonResponse({ 
        result: false, 
        error: "error updating data",
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
