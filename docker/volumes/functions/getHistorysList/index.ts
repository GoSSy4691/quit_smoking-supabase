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

    // check method
    if (req.method !== 'GET') {
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
     
    // Parse query parameters for limit and offset
    const url = new URL(req.url);
    const params = new URLSearchParams(url.search);
    const limit = parseInt(params.get('limit') || '10', 10);
    const offset = parseInt(params.get('offset') || '0', 10);  
    const sort = params.get('sort') || 'id';
    if (isNaN(limit) || isNaN(offset)) {
      return jsonResponse({ 
        result: false, 
        error: 'Invalid limit or offset' 
      }, 400);
    }
    if (limit > 100) {
      return jsonResponse({ 
        result: false, 
        error: 'max limit is 100' 
      }, 400);
    }
    // Validate sort parameter
    const validSortFields = ['id', 'date_timestamp'];
    if (validSortFields.indexOf(sort) === -1) {
      return jsonResponse({ 
        result: false,
        error: 'Invalid sort parameter'
      }, 400);
    }

    // get historys
    const { data: historysData, error: userError } = await supabaseClient
    .from('historys')
    .select('*')
    .order(sort, { ascending: true })
    .range(offset, offset + limit - 1);
    if (userError && !historysData) {
      return jsonResponse({ 
        result: false, 
        error: 'internal error',
        //message: userError.message // debug
      }, 404);
    }
    
    return jsonResponse({result: true, historys: historysData }, 200);
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
