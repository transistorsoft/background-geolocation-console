import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  cardsContainer: {
    padding: 5,
  },
  header: {
    // backgroundColor: theme.palette.primary.dark,
    // color: theme.palette.primary.contrastText,
  },
  appBar: {
    backgroundColor: theme.palette.primary.dark,
  },
  relative: {
    position: 'relative',
  },
}));

export default useStyles;
