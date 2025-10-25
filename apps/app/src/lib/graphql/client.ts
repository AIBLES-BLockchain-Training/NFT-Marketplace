import { Client, cacheExchange, fetchExchange } from 'urql';
import { GRAPHQL_ENDPOINT } from '../contracts/addresses';

export const graphqlClient = new Client({
  url: GRAPHQL_ENDPOINT,
  exchanges: [cacheExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
});
