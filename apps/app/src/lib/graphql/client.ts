import { Client, cacheExchange, fetchExchange } from 'urql';
import { GRAPHQL_ENDPOINT } from '../contracts/addresses';

const urqlClient = new Client({
  url: GRAPHQL_ENDPOINT,
  exchanges: [cacheExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
});

// Wrapper for easier query usage
export const graphqlClient = {
  async query(queryString: string, variables?: Record<string, unknown>) {
    const result = await urqlClient.query(queryString, variables || {}).toPromise();

    if (result.error) {
      console.error('GraphQL Error:', result.error);
      throw new Error(result.error.message);
    }

    return result.data || {};
  }
};
