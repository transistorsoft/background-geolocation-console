import React, {
  Component
} from 'react';
import _ from 'lodash';

import { Dropdown , Input} from 'react-toolbox';

const DeviceField = (props) => {
    console.info(props);
    const entry = _.find(props.source, {value: props.value });
    const text = !entry ? 'No device present' : entry.label;
    return (props.devices || []).length > 1 ?
        <Dropdown
            auto
            label="Device"
            onChange={props.onChange}
            source={props.source}
            value={props.value}
        /> : 
        <Input
            auto
            label="Device"
            readOnly
            value={text}
        />  
};

export default DeviceField;
