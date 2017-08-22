// @flow
import React from 'react';
import _ from 'lodash';

import { Dropdown, Input } from 'react-toolbox';

type Props = {
  onChange: (value: string) => any,
  source: { value: string, label: string }[],
  hasData: boolean,
  value: ?string,
};

const DeviceField = ({ onChange, source, hasData, value }: Props) => {
  const entry = _.find(source, { value: value });
  const text = !entry ? 'No users present' : entry.label;
  return source.length > 1
    ? <Dropdown auto label={`Users (${source.length})`} onChange={onChange} source={source} value={value} />
    : hasData
      ? <Input auto label={`Users (${source.length})`} readOnly value={text} />
      : <Input auto label='Users' readOnly value='Loading users ...' />;
};

export default DeviceField;
