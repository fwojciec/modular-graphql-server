import { myModule } from "@modular-graphql-server/graphql-server";
import { print } from "graphql";

const docs = Array.isArray(myModule.config.typeDefs)
  ? myModule.config.typeDefs
  : [myModule.config.typeDefs];

console.log(docs.map(print).join("\n"));
