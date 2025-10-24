/* НАСТРОЙКИ ПРИЛОЖЕНИЯ */
const loadingDelay = 1200;
const itemsPerPage = 5;
const API_BASE = 'https://v-content.practicum-team.ru';
const apiEndpoint = `${API_BASE}/api/videos?pagination[pageSize]=${itemsPerPage}&`;

/* DOM ЭЛЕМЕНТЫ */
const listContainer = document.querySelector('.content__list');
const listWrapper = document.querySelector('.content__list-container');
const playerContainer = document.querySelector('.result__video-container');
const mediaPlayer = document.querySelector('.result__video');
const searchForm = document.querySelector('form');

/* ШАБЛОНЫ КОМПОНЕНТОВ */
const itemTemplate = document.querySelector('.cards-list-item-template');
const loadingTemplate = document.querySelector('.preloader-template');
const errorTemplate = document.querySelector('.error-template');
const loadMoreTemplate = document.querySelector('.more-button-template');

/* СОСТОЯНИЕ ПРИЛОЖЕНИЯ */

// Хранит данные о текущих элементах на странице
let currentPageItems = [];

// Инициализация приложения

displayLoadingIndicator(loadingTemplate, playerContainer);
displayLoadingIndicator(loadingTemplate, listWrapper);
initializeApp(apiEndpoint);

// Обработка поискового запроса
searchForm.onsubmit = (e) => {
  e.preventDefault();

  listContainer.textContent = '';
  const loadMoreBtn = listWrapper.querySelector('.more-button');
  if (loadMoreBtn) {
    loadMoreBtn.remove();
  }

  [...playerContainer.children].forEach((el) => {
    el.className === 'error' && el.remove();
  });

  displayLoadingIndicator(loadingTemplate, playerContainer);
  displayLoadingIndicator(loadingTemplate, listWrapper);

  const searchData = extractFormData(searchForm);
  const queryUrl = buildSearchQuery(
    apiEndpoint,
    searchData.city,
    searchData.timeArray
  );

  initializeApp(queryUrl);
};

/* ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ */

async function initializeApp(endpoint) {
  try {
    const response = await (await fetch(endpoint)).json();
    currentPageItems = response.results;

    if (!response?.results?.[0]) {
      throw new Error('not-found');
    }

    renderItems({
      baseUrl: API_BASE,
      dataArray: response.results,
      cardTmp: itemTemplate,
      container: listContainer,
    });

    setupPlayer({
      baseUrl: API_BASE,
      video: mediaPlayer,
      videoUrl: response.results[0].video.url,
      posterUrl: response.results[0].poster.url,
    });
    document
      .querySelectorAll('.content__card-link')[0]
      .classList.add('content__card-link_current');
    await waitForMediaReady(mediaPlayer);
    await sleep(loadingDelay);
    hideLoadingIndicator(playerContainer, '.preloader');
    hideLoadingIndicator(listWrapper, '.preloader');

    // Добавляем класс для стилизации скроллбара
    listWrapper.classList.add('custom-scrollbar');

    setupVideoSwitching({
      baseUrl: API_BASE,
      videoData: currentPageItems,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: mediaPlayer,
    });

    setupPagination({
      dataArray: response,
      buttonTemplate: loadMoreTemplate,
      cardsList: listContainer,
      buttonSelector: '.more-button',
      initialEndpoint: endpoint,
      baseUrl: API_BASE,
      cardTmp: itemTemplate,
    });
  } catch (err) {
    if (err.message === 'not-found') {
      displayErrorMessage(playerContainer, errorTemplate, 'Нет подходящих видео =(');
    } else {
      displayErrorMessage(playerContainer, errorTemplate, 'Ошибка получения данных :(');
    }
    console.log(err);
    hideLoadingIndicator(playerContainer, '.preloader');
    hideLoadingIndicator(listWrapper, '.preloader');
  }
}

/* ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ */

// Асинхронная задержка выполнения

async function sleep(ms) {
  return await new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
}

// Ожидание готовности медиа к воспроизведению

async function waitForMediaReady(video) {
  return await new Promise((resolve) => {
    video.oncanplaythrough = resolve;
  });
}

// Отображение индикатора загрузки
function displayLoadingIndicator(tmp, parent) {
  const node = tmp.content.cloneNode(true);
  parent.append(node);
  console.log('показал индикатор загрузки');
}

// Скрытие индикатора загрузки
function hideLoadingIndicator(parent, preloaderSelector) {
  const preloader = parent.querySelector(preloaderSelector);
  if (preloader) {
    preloader.remove();
  }

  console.log('убрал индикатор загрузки');
}

// Создание элементов списка из данных API
function renderItems({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);
    node.querySelector('a').setAttribute('id', el.id);
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent =
      el.description;
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('src', `${baseUrl}${el.thumbnail.url}`);
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('alt', el.description);
    container.append(node);
  });
  console.log('Создал элементы списка');
}

// Настройка видеоплеера
function setupPlayer({ baseUrl, video, videoUrl, posterUrl }) {
  video.setAttribute('src', `${baseUrl}${videoUrl}`);
  video.setAttribute('poster', `${baseUrl}${posterUrl}`);
  console.log('Настроил видеоплеер');
}

// Извлечение данных из формы поиска

function extractFormData(form) {
  const city = form.querySelector('input[name="city"]');
  const checkboxes = form.querySelectorAll('input[name="time"]');
  const checkedValuesArray = [...checkboxes].reduce((acc, item) => {
    item.checked && acc.push(item.value);
    return acc;
  }, []);
  console.log('Извлек данные из формы');
  return {
    city: city.value,
    timeArray: checkedValuesArray,
  };
}

// Формирование URL запроса с параметрами фильтрации
function buildSearchQuery(endpoint, city, timeArray) {
  if (city) {
    endpoint += `filters[city][$containsi]=${city}&`;
  }
  if (timeArray) {
    timeArray.forEach((timeslot) => {
      endpoint += `filters[time_of_day][$eqi]=${timeslot}&`;
    });
  }
  console.log('Сформировал URL запроса с фильтрами');
  return endpoint;
}

// Управление переключением видео
function setupVideoSwitching({
  baseUrl,
  videoData,
  cardLinksSelector,
  currentLinkClassName,
  mainVideo,
}) {
  const cardsList = document.querySelectorAll(cardLinksSelector);
  if (cardsList) {
    cardsList.forEach((item) => {
      item.onclick = async (e) => {
        e.preventDefault();
        cardsList.forEach((item) => {
          item.classList.remove(currentLinkClassName);
        });
        item.classList.add(currentLinkClassName);
        displayLoadingIndicator(loadingTemplate, playerContainer);
        const vidoObj = videoData.find(
          (video) => String(video.id) === String(item.id)
        );
        setupPlayer({
          baseUrl,
          video: mainVideo,
          videoUrl: vidoObj.video.url,
          posterUrl: vidoObj.poster.url,
        });
        await waitForMediaReady(mainVideo);
        await sleep(loadingDelay);
        hideLoadingIndicator(playerContainer, '.preloader');
        console.log('Переключил видео');
      };
    });
  }
}

// Отображение сообщения об ошибке
function displayErrorMessage(container, errorTemplate, errorMessage) {
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.error__title').textContent = errorMessage;
  container.append(node);
  console.log('показал сообщение об ошибке');
}

// Реализация пагинации для загрузки дополнительных элементов

function setupPagination({
  dataArray,
  buttonTemplate,
  cardsList,
  buttonSelector,
  initialEndpoint,
  baseUrl,
  cardTmp,
}) {
  if (dataArray.pagination.page === dataArray.pagination.pageCount) return;
  // добавить кнопку из темплейта в конец списка карточек
  const button = buttonTemplate.content.cloneNode(true);
  listWrapper.append(button);
  // Выберем добавленный элемент по селектору и добавим слушатель клика
  const buttonInDOM = listWrapper.querySelector(buttonSelector);
  buttonInDOM.addEventListener('click', async () => {
    // по клику запросим данные для следующей страницы
    let currentPage = dataArray.pagination.page;
    let urlToFetch = `${initialEndpoint}pagination[page]=${(currentPage += 1)}&`;
    try {
      let data = await (await fetch(urlToFetch)).json();
      buttonInDOM.remove();
      currentPageItems = currentPageItems.concat(data.results);
      renderItems({
        baseUrl,
        dataArray: data.results,
        cardTmp,
        container: cardsList,
      });
      setupVideoSwitching({
        baseUrl: API_BASE,
        videoData: currentPageItems,
        cardLinksSelector: '.content__card-link',
        currentLinkClassName: 'content__card-link_current',
        mainVideo: mediaPlayer,
      });
      setupPagination({
        dataArray: data,
        buttonTemplate,
        cardsList,
        buttonSelector,
        initialEndpoint,
        baseUrl,
        cardTmp,
      });
    } catch (err) {
      return err;
    }
  });
}
