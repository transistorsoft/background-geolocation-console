// @flow

import React, { useState, useCallback } from 'react';
import { connect } from 'react-redux';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles, type Theme } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';

import {
  checkAuth,
  type AuthParams,
} from 'reducer/auth';

import { type MaterialInputElement } from 'reducer/dashboard';

type DispatchProps = {|
  handleSubmit: (params: AuthParams) => any,
|};

const useStyles = makeStyles((theme: Theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: { margin: theme.spacing(3, 0, 2) },
}));

const AuthForm = ({ handleCheckAuth }: DispatchProps) => {
  const classes = useStyles();
  const [values, setValues] = useState({ login: '', password: '' });
  const handleInputChange = useCallback((event: MaterialInputElement) => {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    setValues({
      ...values,
      [name]: value,
    });
  });
  const handleSubmit = useCallback((event: Event) => {
    event.preventDefault();
    handleCheckAuth(values);
  }, values);

  return (
    <Container component='main' maxWidth='xs'>
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component='h1' variant='h5'>
          Sign in
        </Typography>
        <form className={classes.form} noValidate onSubmit={handleSubmit}>
          <TextField
            variant='outlined'
            margin='normal'
            required
            fullWidth
            id='login'
            label='Login'
            name='login'
            autoComplete='login'
            onChange={handleInputChange}
            autoFocus
          />
          <TextField
            variant='outlined'
            margin='normal'
            required
            fullWidth
            name='password'
            onChange={handleInputChange}
            label='Password'
            type='password'
            id='password'
            autoComplete='current-password'
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            color='primary'
            className={classes.submit}
          >
            Sign In
          </Button>
        </form>
      </div>
    </Container>
  );
};

const mapDispatchToProps: DispatchProps = { handleCheckAuth: checkAuth };

export default connect(undefined, mapDispatchToProps)(AuthForm);
