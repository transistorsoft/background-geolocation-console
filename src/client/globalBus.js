// @flow
import emitter from 'event-emitter';
import { type Tab } from '~/reducer/dashboard';

export type FitBoundsPayload = {} & $Shape<{}>;
export const fitBoundsBus: Bus<FitBoundsPayload> = makeBus(); // eslint-disable-line no-use-before-define

export type ScrollToRowPayload = {| locationId: string |};
export const scrollToRowBus: Bus<ScrollToRowPayload> = makeBus(); // eslint-disable-line no-use-before-define

export type ChangeTabPayload = {| tab: Tab |};
export const changeTabBus: Bus<ChangeTabPayload> = makeBus(); // eslint-disable-line no-use-before-define

type Bus<Payload> = {
  subscribe: (handler: (payload: Payload) => any) => void,
  unsubscribe: (handler: (payload: Payload) => any) => void,
  emit: (payload: Payload) => void,
};
function makeBus<Payload> (): Bus<Payload> {
  const e = emitter();
  return {
    subscribe: function (handler: (payload: Payload) => any) {
      e.on('event', handler);
    },
    unsubscribe: function (handler: (payload: Payload) => any) {
      e.off('event', handler);
    },
    emit: function (payload: Payload) {
      e.emit('event', payload);
    },
  };
}
