import { GraphQLConnector, createServer } from "./graphql-server";
import { request } from "graphql-request";
import * as net from "net";
import * as http from "http";

describe("createServer", () => {
  it("should merge schemas", async () => {
    const c1: GraphQLConnector = {
      typeDefs: [`type Query { a: String }`],
    };
    const c2: GraphQLConnector = {
      typeDefs: [`type Query { b: String }`],
    };
    const server = await createServer({
      connectors: [c1, c2],
    });
    const req = `query { a b }`;
    const result = await runGraphQLQuery(req, server);
    expect(result).toEqual({ a: null, b: null });
  });

  it("should merge resolvers", async () => {
    const c1: GraphQLConnector = {
      typeDefs: [`type Query { a: String }`],
      resolvers: { Query: { a: () => "a" } },
    };
    const c2: GraphQLConnector = {
      typeDefs: [`type Query { b: String }`],
      resolvers: { Query: { b: () => "b" } },
    };
    const server = await createServer({
      connectors: [c1, c2],
    });
    const q = `query { a b }`;
    const result = await runGraphQLQuery(q, server);
    expect(result).toEqual({ a: "a", b: "b" });
  });

  it("should compose context factories", async () => {
    const c1: GraphQLConnector<{ a: string }> = {
      typeDefs: [`type Query { a: String }`],
      resolvers: { Query: { a: (_, __, ctx) => ctx.a } },
      contextFactory: () => () => ({ a: "a" }),
    };
    const c2: GraphQLConnector<{ b: string }> = {
      typeDefs: [`type Query { b: String }`],
      resolvers: { Query: { b: (_, __, ctx) => ctx.b } },
      contextFactory: () => () => ({ b: "b" }),
    };
    const server = await createServer({
      connectors: [c1, c2],
    });
    const q = `query { a b }`;
    const result = await runGraphQLQuery(q, server);
    expect(result).toEqual({ a: "a", b: "b" });
  });

  it("should compose context factories with connections", async () => {
    const c1: GraphQLConnector<{ a: string }, { a: string }> = {
      typeDefs: [`type Query { a: String }`],
      resolvers: { Query: { a: (_, __, ctx) => ctx.a } },
      contextFactory: (connections) => () => ({ a: connections.a }),
    };
    const c2: GraphQLConnector<{ b: string }, { b: string }> = {
      typeDefs: [`type Query { b: String }`],
      resolvers: { Query: { b: (_, __, ctx) => ctx.b } },
      contextFactory: (connections) => () => ({ b: connections.b }),
    };
    const server = await createServer(
      {
        connectors: [c1, c2],
      },
      { a: "a", b: "b" }
    );
    const q = `query { a b }`;
    const result = await runGraphQLQuery(q, server);
    expect(result).toEqual({ a: "a", b: "b" });
  });
});

async function runGraphQLQuery(query: string, server: http.Server) {
  const port = await getUnusedPort();
  return new Promise((resolve, reject) => {
    server
      .listen({ port }, () => {
        request(`http://localhost:${port}`, query)
          .then((resp) => {
            resolve(resp);
          })
          .catch((err) => {
            reject(err);
          })
          .finally(() => {
            server.close();
          });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function getUnusedPort(): Promise<number> {
  const server = net.createServer();
  return new Promise<number>((resolve, reject) => {
    server.listen(0);
    server.on("listening", () => {
      const address = server.address();
      if (typeof address !== "string") {
        resolve(address.port);
      } else {
        reject(new Error("Could not determine port"));
      }
    });
    server.on("error", (err) => {
      reject(err);
    });
  }).finally(() => {
    server.close();
  });
}
