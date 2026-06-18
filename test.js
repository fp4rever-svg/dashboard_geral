async function test() {
  const r = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "test" }] })
  });
  const text = await r.text();
  console.log("STATUS:", r.status);
  console.log("TEXT:", text);
}
test();
