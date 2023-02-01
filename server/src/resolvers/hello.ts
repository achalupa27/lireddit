import { Query, Resolver } from 'type-graphql';

// Resolvers resolve GraphQL queries

@Resolver()
export class HelloResolver {
    @Query(() => String) // In TypeGraphQL need to declare what query returns
    hello() {
        return 'bye';
    }
}
