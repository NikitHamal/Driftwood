export const $ = (s) => document.querySelector(s);
export const setLoad = (p, t) => {
  $('#loadFill').style.width = p + '%';
  if (t) $('#loadTip').textContent = t;
};
