// @flow
import emitter from 'event-emitter';

import { type Tab } from 'reducer/state';

export type FitBoundsPayload = {} & $Shape<{}>;

// eslint-disable-next-line no-use-before-define
export const fitBoundsBus: Bus<FitBoundsPayload> = makeBus();

export type ScrollToRowPayload = {| locationId: string |};
// eslint-disable-next-line no-use-before-define
export const scrollToRowBus: Bus<ScrollToRowPayload> = makeBus();

export type ChangeTabPayload = {| tab: Tab |};
// eslint-disable-next-line no-use-before-define
export const changeTabBus: Bus<ChangeTabPayload> = makeBus();

type Bus<Payload> = {
  subscribe: (handler: (payload: Payload) => any) => void,
  unsubscribe: (handler: (payload: Payload) => any) => void,
  emit: (payload: Payload) => void,
};
function makeBus<Payload>(): Bus<Payload> {
  const e = emitter();
  return {
    subscribe(handler: (payload: Payload) => any) {
      e.on('event', handler);
    },
    unsubscribe(handler: (payload: Payload) => any) {
      e.off('event', handler);
    },
    emit(payload: Payload) {
      e.emit('event', payload);
    },
  };
}
