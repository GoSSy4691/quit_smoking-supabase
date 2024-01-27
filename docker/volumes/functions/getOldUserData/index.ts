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

    // get user email
    const { email } = data.user;
    if (!email) {
      return jsonResponse({ 
        result: false, 
        error: "no email associated with user" 
      }, 404);
    }

    // try to find old user data by email and get get old user id
    const oldUserData = await getOldUserDataByEmail(supabaseClient, email);
    if (!oldUserData) {
      return jsonResponse({ 
        result: false, 
        error: "no old user data associated with user by email",
        email: email
      }, 404);
    }
    const oldUserId = oldUserData.localId;

    // get user questions and historys by old user id
    const oldUserQuestions = await getQuestionsByOldUserId(supabaseClient, oldUserId);
    const oldUserHistorys = await getHistorysByOldUserId(supabaseClient, oldUserId);

    return jsonResponse({ oldUserData, oldUserQuestions, oldUserHistorys }, 200);
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

async function getOldUserDataByEmail(supabaseClient, email) {
  const { data, error } = await supabaseClient
    .from('auth_users_old')
    .select('*')
    .eq('email', email)
    .limit(1);
  if (error) {
    console.error('Error fetching data:', error);
    throw new Error("Error fetching old user data");
  }
  return data[0] || null;
}

async function getQuestionsByOldUserId(supabaseClient, oldUserId) {
  const { data, error } = await supabaseClient
    .from('questions')
    .select('*')
    .eq('uid', oldUserId);
  if (error) {
    console.error('Error fetching data:', error);
    throw new Error("Error fetching old user questions");
  }
  return data || null;
}

async function getHistorysByOldUserId(supabaseClient, oldUserId) {
  const { data, error } = await supabaseClient
    .from('historys')
    .select('*')
    .eq('uid', oldUserId);
  if (error) {
    console.error('Error fetching data:', error);
    throw new Error("Error fetching old user historys");
  }
  return data || null;
}