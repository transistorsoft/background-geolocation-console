import firebasePkg from 'firebase-admin';
const { firestore } = firebasePkg
import { omitBy } from 'lodash-es';
console.info(firestore, omitBy);
