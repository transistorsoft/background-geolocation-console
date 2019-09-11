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
        {source.map(x => (<MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>))}
      </Select>
    : hasData
      ? <TextField fullWidth label='Device' disabled value={text} />
      : <TextField fullWidth label='Device' disabled value='Loading devices ...' />;
};

export default DeviceField;
