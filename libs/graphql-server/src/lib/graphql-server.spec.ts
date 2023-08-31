import { graphqlServer } from "./graphql-server";

describe("graphqlServer", () => {
  it("should work", () => {
    expect(graphqlServer()).toEqual("graphql-server");
  });
});
