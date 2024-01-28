import { serve } from "https://deno.land/std@0.177.1/http/server.ts";

serve(async () => {
    const template = `
        <html>
            <body>
                <h2>Изменение почты</h2>
                <p>Введите код в приложении: <b>{{ .Token }}</b></p>
            </body>
        </html>
    `;
    return new Response(
        template,
        { headers: { "Content-Type": "text/html" } },
    );
});
