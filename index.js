export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("Backend AI aktif 🚀");
    }

    if (request.method === "POST") {
      const body = await request.json();

      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a Korean grammar tutor." },
              { role: "user", content: body.message }
            ]
          })
        }
      );

      const data = await openaiRes.json();

      if (!data.choices) {
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify({
          reply: data.choices[0].message.content
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
