const auth = () => ({
  currentUser: {
    getIdToken: async () => '',
  },
  onAuthStateChanged: (callback: any) => {
    callback(null);
    return () => {};
  },
  signOut: async () => {},
});

export default auth;
