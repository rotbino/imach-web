/** Init single-node replica set rs0 — idempotent. Run with: node scripts/mongo-rs-init.js */
const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient("mongodb://127.0.0.1:27017/?directConnection=true");
  try {
    const hello = await client.db("admin").command({ hello: 1 });
    if (hello.setName === "rs0") {
      console.log("RS rs0 already initialized");
      process.exit(0);
    }
  } catch {
    /* proceed to initiate */
  }
  try {
    await client.db("admin").command({
      replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] },
    });
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const hello = await client.db("admin").command({ hello: 1 });
        if (hello.isWritablePrimary) {
          console.log("RS rs0 initiated — PRIMARY ready");
          process.exit(0);
        }
      } catch { /* retry */ }
    }
    console.error("RS did not become primary in time");
    process.exit(1);
  } catch (e) {
    if (/already initialized/i.test(String(e))) {
      console.log("RS rs0 already initialized");
      process.exit(0);
    }
    console.error("rs init failed:", e.message);
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
})();
