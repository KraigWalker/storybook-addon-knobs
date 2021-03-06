import React from 'react';
import WrapStory from './components/WrapStory';
import KnobStore from './KnobStore';
import deepEqual from 'deep-equal';

// This is used by _mayCallChannel to determine how long to wait to before triggering a panel update
const PANEL_UPDATE_INTERVAL = 400;

export default class KnobManager {
  constructor() {
    this.knobStore = null;
    this.knobStoreMap = {};
  }

  knob(name, options) {
    this._mayCallChannel();

    const knobStore = this.knobStore;
    const existingKnob = knobStore.get(name);
    // We need to return the value set by the knob editor via this.
    // But, if the user changes the code for the defaultValue we should set
    // that value instead.
    if (existingKnob && deepEqual(options.value, existingKnob.defaultValue)) {
      return existingKnob.value;
    }

    const defaultValue = options.value;
    const knobInfo = {
      ...options,
      name,
      defaultValue,
    };

    knobStore.set(name, knobInfo);
    return knobStore.get(name).value;
  }

  wrapStory(channel, storyFn, context) {
    this.channel = channel;
    const key = `${context.kind}:::${context.story}`;
    let knobStore = this.knobStoreMap[key];

    if (!knobStore) {
      knobStore = this.knobStoreMap[key] = new KnobStore();
    }

    this.knobStore = knobStore;
    knobStore.markAllUnused();
    const initialContent = storyFn(context);
    const props = { context, storyFn, channel, knobStore, initialContent };
    return (<WrapStory {...props} />);
  }

  _mayCallChannel() {
    // Re rendering of the story may cause changes to the knobStore. Some new knobs maybe added and
    // Some knobs may go unused. So we need to update the panel accordingly. For example remove the
    // unused knobs from the panel. This function sends the `setKnobs` message to the channel
    // triggering a panel re-render.

    if (this.calling) {
      // If a call to channel has already registered ignore this call.
      // Once the previous call is completed all the changes to knobStore including the one that
      // triggered this, will be added to the panel.
      // This avoids emitting to the channel within very short periods of time.
      return;
    }
    this.calling = true;

    setTimeout(() => {
      this.calling = false;
      // emit to the channel and trigger a panel re-render
      this.channel.emit('addon:knobs:setKnobs', this.knobStore.getAll());
    }, PANEL_UPDATE_INTERVAL);
  }
}
