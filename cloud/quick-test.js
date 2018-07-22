const Knex = require("knex");
var { Client } = require("pg");

async function test2() {
  const knex = Knex({
    client: "pg",
    connection: {
      port: "2346",
      database: "sec_ctrl_test",
      user: "sec_ctrl_test"
    }
  });

  const res = await knex.table("sites").update({ owner_id: null });
  console.log(res);
}

async function test1() {
  const client = new Client({
    port: "2346",
    database: "sec_ctrl_test",
    user: "sec_ctrl_test"
  });
  await client.connect();

  const res = await client.query("UPDATE sites SET owner_id = null");
  console.log(res);
}

test2()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch(err => {
    throw err;
  });
