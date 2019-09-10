// @flow
import React from 'react';
import find from 'lodash/fp/find';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';

type Props = {
  onChange: (value: string) => any,
  source: { value: string, label: string }[],
  hasData: boolean,
  value: ?string,
};

const DeviceField = ({ onChange, source, hasData, value }: Props) => {
  const entry = find(source, { value: value });
  const text = !entry ? 'No device present' : entry.label;
  return source.length > 1
    ? <Select autoWidth label='Device' onChange={onChange} value={value}>
        {source.map(x => (<MenuItem key={x.value} value={x.valur}>{x.label}</MenuItem>))}
      </Select>
    : hasData
      ? <TextField fullWidth label='Device' readOnly value={text} />
      : <TextField fullWidth label='Device' readOnly value='Loading devices ...' />;
};

export default DeviceField;
