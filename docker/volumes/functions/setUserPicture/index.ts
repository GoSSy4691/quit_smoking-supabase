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
    const userId = data.user.id;

    // get data
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return jsonResponse({ 
        result: false, 
        error: "file is missing in request body"
      }, 400);
    }
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (validMimeTypes.indexOf(file.type) === -1) {
      return jsonResponse({ 
        result: false, 
        error: "invalid file type"
      }, 400);
    }

    // Check if a file with the given userId already exists in the storage bucket
    const { data: existingFiles, error: listError } = await supabaseClient.storage
      .from('profilePicture')
      .list('', { search: userId });
    if (listError) {
      return jsonResponse({ 
        result: false, 
        error: "internal error when searching old img",
        //message:  listError.message // debug
      }, 500);
    }
    // Delete the existing file if it matches the userId
    if (existingFiles.length > 0) {
      const { error: deleteError } = await supabaseClient.storage
        .from('profilePicture')
        .remove(existingFiles.map(file => file.name));
      if (deleteError) {
        return jsonResponse({ 
          result: false, 
          error: "internal error when deleting old img",
          //message:  deleteError.message // debug
        }, 500);
      }
    }

    // Upload the new image to storage
    const { uploadData, error: uploadError } = await supabaseClient.storage
      .from('profilePicture')
      //.upload(`images/${userId}-${file.name}`, file.stream())
      .upload(`${userId}`, file.stream())
    if (uploadError) {
      return jsonResponse({ 
        result: false, 
        error: "internal error when saving new img",
        //message:  uploadError.message // debug
      }, 500);
    }

    return jsonResponse({ result: true, message: "data added successfully" }, 200);
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
