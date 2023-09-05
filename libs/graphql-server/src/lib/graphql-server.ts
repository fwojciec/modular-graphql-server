import * as http from "http";
import * as express from "express";
import { json } from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { IResolvers } from "@graphql-tools/utils";

export type Request = express.Request;
export type BaseConnections = {};
export type BaseContext = {};
export type BaseResolvers<Context = BaseContext, TSource = any> = IResolvers<
  TSource,
  Context
>;

export type GraphQLConnector<
  Context = BaseContext,
  Connections = BaseConnections,
  Resolvers = BaseResolvers<Context>
> = {
  typeDefs: string[];
  resolvers?: Resolvers;
  contextFactory?: (connections: Connections) => (req: Request) => Context;
};

export type CreateServerOptions = {
  connectors: GraphQLConnector[];
  express?: express.Express;
};

export async function createServer(
  opts: CreateServerOptions,
  connections: BaseConnections = {}
): Promise<http.Server> {
  const app = opts.express ? opts.express : express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    typeDefs: mergeTypeDefs(opts.connectors.map((c) => c.typeDefs).flat()),
    resolvers: mergeResolvers(
      opts.connectors
        .filter((c) => c.resolvers !== undefined)
        .map((c) => c.resolvers)
        .flat()
    ),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  app.use(
    "/",
    json(),
    expressMiddleware(server, {
      context: async ({ req }) =>
        opts.connectors
          .filter((c) => c.contextFactory !== undefined)
          .map((c) => c.contextFactory)
          .reduce((acc, f) => ({ ...acc, ...f(connections)(req) }), {}),
    })
  );
  return httpServer;
}
