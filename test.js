async function test() {
  const payload = {
    messages: [
      {
        role: "user",
        content: "Faça uma análise detalhada sobre o absenteísmo registrado hoje. Quais setores/líderes estão críticos (acima de 5%) e o que recomenda fazer?"
      }
    ]
  };
  const r = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await r.text();
  console.log("STATUS:", r.status);
  console.log("TEXT:", text);
}
test();
