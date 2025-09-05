import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileId, workspaceId } = await req.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'fileId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use the provided workspaceId or fallback to the default
    const dustWorkspaceId = workspaceId || 'tcYbszCY4S';
    
    // Check if API key is available
    const apiKey = Deno.env.get('DUST_API_KEY');
    if (!apiKey) {
      console.error('DUST_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'DUST_API_KEY not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Construct the correct URL with workspace ID
    const url = `https://dust.tt/api/v1/w/${dustWorkspaceId}/files/${fileId}/content`;
    
    console.log('Downloading file from URL:', url);
    console.log('Using workspace ID:', dustWorkspaceId);
    console.log('API key available:', !!apiKey);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChewieAI-EdgeFunction/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dust API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Dust API error: ${response.status} - ${errorText}`,
          url: url,
          workspaceId: dustWorkspaceId
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Get the file content as a blob
    const fileBlob = await response.blob();
    
    // Convert blob to base64 for transmission
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return new Response(
      JSON.stringify({
        success: true,
        content: base64,
        contentType: contentType,
        size: fileBlob.size,
        url: url,
        workspaceId: dustWorkspaceId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error downloading file:', error);
    return new Response(
      JSON.stringify({ 
        error: `Internal server error: ${error.message}`,
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
