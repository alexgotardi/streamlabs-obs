// This class provides the "glue" between the node-obs module
// and the Vue app. This class is intended to be a singleton.

const { ipcRenderer } = window.require('electron');

import _ from 'lodash';

// Behaves just like the node-obs library, but proxies
// all methods via the main process
const nodeObs = new Proxy({}, {
  get(target, key) {
    return function() {
      return ipcRenderer.sendSync('obs-apiCall', {
        method: key,
        args: Array.from(arguments)
      });
    };
  }
});

class ObsApi {

  constructor() {
    this.nodeObs = nodeObs;
  }

  createScene(name) {
    nodeObs.OBS_content_createScene(name);
  }

  removeScene(name) {
    nodeObs.OBS_content_removeScene(name);
  }

  getScenes() {
    return nodeObs.OBS_content_getListCurrentScenes();
  }

  createSource(sceneName, sourceType, sourceName) {
    nodeObs.OBS_content_addSource(
      sourceType,
      sourceName,
      {},
      {},
      sceneName
    );
  }

  removeSource(sourceName) {
    nodeObs.OBS_content_removeSource(
      sourceName
    );
  }

  sourceProperties(sourceName) {
    const propertyArr = nodeObs.OBS_content_getSourceProperties(sourceName);

    return _.map(_.chunk(propertyArr, 3), prop => {
      let propertyObj = {
        source: sourceName,
        name: prop[0],
        description: prop[1],
        type: prop[2]
      };

      // For list types, we must separately fetch the
      // list options.
      if (propertyObj.type === 'OBS_PROPERTY_LIST') {
        propertyObj.options = nodeObs.
          OBS_content_getSourcePropertiesSubParameters(sourceName, propertyObj.name);
      }

      propertyObj.value = this.getPropertyValue(propertyObj);

      return propertyObj;
    });
  }

  getPropertyValue(property) {
    let value = nodeObs.OBS_content_getSourcePropertyCurrentValue(
      property.source,
      property.name
    );

    if (property.type === 'OBS_PROPERTY_LIST') {
      value = this.findClosestOption(property.options, value);
    }

    if (property.type === 'OBS_PROPERTY_BOOL') {
      // Convert from string to boolean value
      value = value === 'true';
    }

    if (property.type === 'OBS_PROPERTY_FLOAT') {
      value = parseFloat(value);
    }

    return value;
  }

  // Sometimes the value we receive from OBS is not a perfect
  // match.  So we need to find the closest option.
  findClosestOption(options, value) {
    return _.find(options, option => {
      return value.includes(option);
    });
  }

  setProperty(property, value) {
    nodeObs.OBS_content_setProperty(
      property.source,
      property.name,
      value.toString()
    );
  }

  availableSources() {
    return nodeObs.OBS_content_getListInputSources();
  }

  startStreaming() {
    nodeObs.OBS_service_startStreaming();
  }

  stopStreaming() {
    nodeObs.OBS_service_stopStreaming();
  }

  startRecording() {
    nodeObs.OBS_service_startRecording();
  }

  stopRecording() {
    nodeObs.OBS_service_stopRecording();
  }

}

export default new ObsApi();
