import { Client, cacheExchange, fetchExchange } from 'urql';
import { GRAPHQL_ENDPOINT } from '../contracts/addresses';

const urqlClient = new Client({
  url: GRAPHQL_ENDPOINT,
  exchanges: [cacheExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
});

// Wrapper for easier query usage
export const graphqlClient = {
  async query(
    queryString: string,
    variables?: Record<string, unknown>,
    options?: { ignoreErrors?: boolean }
  ) {
    const result = await urqlClient.query(queryString, variables || {}).toPromise();

    if (result.error) {
      console.error('GraphQL Error:', result.error);
      // If ignoreErrors is true or we have partial data, return what we have
      if (options?.ignoreErrors || result.data) {
        console.warn('Returning partial data despite errors');
        return result.data || {};
      }
      throw new Error(result.error.message);
    }

    return result.data || {};
  }
};
