import { Inngest } from 'inngest';

// Create the Inngest client
export const inngest = new Inngest({
  id: 'xeroscroll',
  name: 'XeroScroll',
});

// Event types
export type Events = {
  'digest/send': {
    data: {
      userId: number;
      email: string;
    };
  };
  'digest/trigger-all': {
    data: {
      hourUtc: number;
    };
  };
};
