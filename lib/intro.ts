// Заставка на главной не нужна посетителям с рекламы или рассылки (utm-метки, yclid): они сразу видят первый экран.
export const AD_PARAMS = /[?&](utm_[a-z]+|yclid)=/i;

/** Встраивается в layout и срабатывает при разборе HTML, до загрузки JS: заставка не мелькает ни на миг. */
export const HIDE_INTRO_FOR_ADS = `if(${AD_PARAMS}.test(location.search)){var s=document.createElement("style");s.textContent=".rapid-intro{display:none}";document.head.appendChild(s)}`;
