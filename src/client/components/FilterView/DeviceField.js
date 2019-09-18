// @flow
import React from 'react';
import { Select, TextField, MenuItem } from '@material-ui/core';

type Props = {
  onChange: (value: string) => any,
  source: { value: string, label: string }[],
  hasData: boolean,
  value: ?string,
};

const DeviceField = ({ onChange, source, hasData, value }: Props) => {
  const entry = !!source && source.find(x => x.value === value);
  const text = !entry ? 'No device present' : entry.label;
  return source.length > 1
    ? <Select autoWidth style={{ display: 'flex' }} label='Device' onChange={e => onChange(e.target.value)} value={value || ''}>
        {source.map(x => <MenuItem key={x.value} value={x.value}>{x.label}</MenuItem>)}
      </Select>
    : hasData
      ? <TextField fullWidth label='Device' disabled value={text} />
      : <TextField fullWidth label='Device' disabled value='Loading devices ...' />;
};

export default DeviceField;
