import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  apiUrl: 'http://localhost:3002',
  razorpayKey: 'rzp_live_xxxxxxxxxxxx',
  razorpayKeyId:'',
  googleMapsApiKey:'AIzaSyDKsK100m1obqgkQJILOEafWm2mReD0whA',
  testMode: false,
  imageUrl:'https://school-management-backend-khaki.vercel.app',
  masterKey: '269b5f601ec89cc265a0150bc5826459fb0f90f38914dd22f221dc868c1ef3bd',
  deviceFp: '8e61a7e7ecce44b9258259799eeb74ee26da247c351af19bc7057644062759f0',
  
};
