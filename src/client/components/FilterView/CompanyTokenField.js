// @flow
import React from 'react';

import { Dropdown } from 'react-toolbox';

type Props = {
  onChange: (value: string) => any,
  source: { value: string, label: string }[],
  value: ?string,
};

const DeviceField = ({ onChange, source, value }: Props) => {
  return source.length > 1 ? <Dropdown auto label='Device' onChange={onChange} source={source} value={value} /> : null;
};

export default DeviceField;
