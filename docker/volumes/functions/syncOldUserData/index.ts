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

    // get user data and get newUserId
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) {
      return jsonResponse({ 
        result: false, 
        error: "unauthorized user"
      }, 401);
    }
    const newUserId = data.user.id;

    // get user email
    const { email } = data.user;
    if (!email) {
      return jsonResponse({ 
        result: false, 
        error: "no email associated with user" 
      }, 404);
    }

    // get old user id
    const oldUserLocalId = await getOldUserLocalIdByEmail(supabaseClient, email);
    if (!oldUserLocalId) {
      return jsonResponse({ 
        result: false, 
        error: "no old user localId associated with user by email",
        email: email
      }, 404);
    }

    // get old user questions and historys and update them to new user id
    const oldUserQuestions = await getAndUpdateQuestionsByOldUserId(supabaseClient, oldUserLocalId, newUserId);
    const oldUserHistorys = await getAndUpdateHistorysByOldUserId(supabaseClient, oldUserLocalId, newUserId);
    const oldUser = await getAndUpdateUserByOldUserId(supabaseClient, oldUserLocalId, newUserId);

    return jsonResponse({
      result: true,
      "newUserId" :newUserId, 
      "oldUserId" :oldUserLocalId, 
      "updatedData": {
        oldUserQuestions, 
        oldUserHistorys,
        oldUser
      }
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

async function getOldUserLocalIdByEmail(supabaseClient, email) {
  const { data, error } = await supabaseClient
    .from('auth_users_old')
    .select('localId')
    .eq('email', email)
    .limit(1);
  if (error) {
    console.error('Error fetching data:', error);
    throw new Error("Error fetching old user localId");
  }
  return data[0]?.localId || null;
}

async function getAndUpdateQuestionsByOldUserId(supabaseClient, oldUserId, newUserId) {
  // get
  const { data, error } = await supabaseClient
    .from('questions')
    .select('*')
    .eq('uid', oldUserId);
  if (error) {
    console.error('Error fetching data:', error);
    throw new Error("Error fetching old user questions");
  }
  
  // update
  if (data && data.length > 0) {
    const { updateData, updateError } = await supabaseClient
      .from('questions')
      .update({ uid: newUserId })
      .eq('uid', oldUserId);
    if (updateError) {
      console.error('Error updating data:', updateError);
      throw new Error("Error updating old user questions");
    }
    console.log(updateData);
  }
  
  return data || null;
}

async function getAndUpdateHistorysByOldUserId(supabaseClient, oldUserId, newUserId) {
  // get
  const { data, error } = await supabaseClient
    .from('historys')
    .select('*')
    .eq('uid', oldUserId);
  if (error) {
    console.error('Error fetching data:', error);
    throw new Error("Error fetching old user historys");
  }

  // update
  if (data && data.length > 0) {
    const { updateData, updateError } = await supabaseClient
      .from('historys')
      .update({ uid: newUserId })
      .eq('uid', oldUserId);
    if (updateError) {
      console.error('Error updating data:', updateError);
      throw new Error("Error updating old user questions");
    }
    console.log(updateData);
  }

  return data || null;
}

async function getAndUpdateUserByOldUserId(supabaseClient, oldUserId, newUserId) {
  // get
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('uid', oldUserId);
  if (error) {
    console.error('Error fetching data:', error);
    throw new Error("Error fetching old user historys");
  }

  // update
  if (data && data.length > 0) {
    const { updateData, updateError } = await supabaseClient
      .from('users')
      .update({ uid: newUserId })
      .eq('uid', oldUserId);
    if (updateError) {
      console.error('Error updating data:', updateError);
      throw new Error("Error updating old user questions");
    }
    console.log(updateData);
  }

  return data || null;
}
