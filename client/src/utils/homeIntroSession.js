export const HOME_INTRO_PLAYED_SESSION_KEY = "asiatechsync-home-intro-played";
export const HOME_INTRO_PLAYED_EVER_KEY = "asiatechsync-home-intro-played-ever";

export const hasHomeIntroPlayedThisSession = () => {
  try {
    return (
      window.sessionStorage.getItem(HOME_INTRO_PLAYED_SESSION_KEY) === "true"
    );
  } catch (error) {
    return false;
  }
};

export const hasHomeIntroPlayedEver = () => {
  try {
    return (
      window.localStorage.getItem(HOME_INTRO_PLAYED_EVER_KEY) === "true"
    );
  } catch (error) {
    return false;
  }
};

export const markHomeIntroPlayedThisSession = () => {
  try {
    window.sessionStorage.setItem(HOME_INTRO_PLAYED_SESSION_KEY, "true");
  } catch (error) {
    return;
  }
};

export const markHomeIntroPlayedEver = () => {
  try {
    window.localStorage.setItem(HOME_INTRO_PLAYED_EVER_KEY, "true");
  } catch (error) {
    return;
  }
};

export const resetHomeIntroPlayedThisSession = () => {
  try {
    window.sessionStorage.removeItem(HOME_INTRO_PLAYED_SESSION_KEY);
  } catch (error) {
    return;
  }
};

export const resetHomeIntroPlayedEver = () => {
  try {
    window.localStorage.removeItem(HOME_INTRO_PLAYED_EVER_KEY);
  } catch (error) {
    return;
  }
};
