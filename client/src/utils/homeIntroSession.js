export const HOME_INTRO_PLAYED_SESSION_KEY = "asiatechsync-home-intro-played";

export const hasHomeIntroPlayedThisSession = () => {
  try {
    return (
      window.sessionStorage.getItem(HOME_INTRO_PLAYED_SESSION_KEY) === "true"
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

export const resetHomeIntroPlayedThisSession = () => {
  try {
    window.sessionStorage.removeItem(HOME_INTRO_PLAYED_SESSION_KEY);
  } catch (error) {
    return;
  }
};
