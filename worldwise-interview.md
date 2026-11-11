# WorldWise — texnik intervyu uchun savol-javoblar

> **Stack:** React 19 · Vite 8 · React Router 7 · react-leaflet 5 (Leaflet) · react-datepicker · json-server · CSS Modules
> Barcha kod parchalari `src/` dagi haqiqiy fayllardan olingan, qator raqamlari kodning joriy holatiga mos.
> Darajalar: **[Junior]**, **[Strong junior]**, **[Middle]**.

## Mundarija

1. ["Bu loyihani tushuntirib bering" — 2 daqiqalik javob](#1-bu-loyihani-tushuntirib-bering--2-daqiqalik-javob)
2. [Papkalar tuzilmasi va arxitektura](#2-papkalar-tuzilmasi-va-arxitektura)
3. [Routing](#3-routing)
4. [Context: CitiesContext va AuthContext](#4-context-citiescontext-va-authcontext)
5. [Custom hook'lar](#5-custom-hooklar)
6. [Ma'lumot yuklash](#6-malumot-yuklash)
7. [Performance](#7-performance)
8. [Forma va xarita](#8-forma-va-xarita)
9. [Stillash](#9-stillash)
10. [Build va deploy](#10-build-va-deploy)
11. [Kodimdagi kamchiliklar va yaxshilash yo'llari](#11-kodimdagi-kamchiliklar-va-yaxshilash-yollari)

---

## 1. "Bu loyihani tushuntirib bering" — 2 daqiqalik javob

> WorldWise — sayohat qilingan shaharlarni xaritada belgilab boradigan SPA. Foydalanuvchi xaritaning istalgan joyini bosadi, ilova shu koordinata bo'yicha shahar va davlatni avtomatik aniqlaydi, foydalanuvchi esa sana va izoh qo'shib saqlaydi. Keyin barcha shaharlar ro'yxatda, davlatlar alohida ro'yxatda va xaritada marker sifatida ko'rinadi.
>
> Texnik tomondan bu React 19 va Vite. Routing uchun React Router ishlatdim: public sahifalar — Homepage, Product, Pricing, Login — va himoyalangan `/app` qismi. `/app` ichida nested route'lar bor: `cities`, `cities/:id`, `countries` va `form`. Ular Sidebar ichidagi `<Outlet />` da render bo'ladi, xarita esa doim yonida turadi.
>
> State'ni uch joyga ajratdim. Server'dan keladigan shaharlar `CitiesContext` da, `useReducer` + Context API bilan saqlanadi. Barcha CRUD funksiyalari — `getCity`, `createCity`, `deleteCity` — provider ichida, komponentlar esa faqat `useCities()` hook'ini chaqiradi. Autentifikatsiya alohida `AuthContext` da, hozircha fake user bilan; `ProtectedRoute` login qilmagan foydalanuvchini `/login` ga yo'naltiradi. Uchinchi joy — URL: xaritadagi koordinata `?lat=&lng=` query parametrida turadi, shuning uchun link'ni ulashsa yoki sahifani yangilasa ham holat saqlanadi. Buni `useUrlPosition` custom hook'i o'qiydi, brauzer geolokatsiyasi uchun esa `useGeolocation` hook'ini yozdim.
>
> Xarita Leaflet va react-leaflet'da qurilgan. Xaritani bosganda `useMapEvents` orqali formaga o'tiladi. Forma BigDataCloud reverse-geocoding API'sidan shahar nomini oladi va davlat kodidan bayroq emoji yasaydi. Backend sifatida lokal json-server ishlatdim, REST API orqali: GET, POST va DELETE.
>
> Performance uchun sahifalarni `React.lazy` + `Suspense` bilan code splitting qildim. Masalan, Leaflet joylashgan `AppLayout` alohida chunk'da, shuning uchun landing page'ni ochgan odam uni yuklamaydi. Stillash CSS Modules'da, uchinchi tomon kutubxonalari (Leaflet, datepicker) uchun `:global` ishlatdim.
>
> Davom ettirsam, keyingi qadamlarim: haqiqiy auth va backend, server state uchun React Query va formadagi request'larni AbortController bilan bekor qilish.

---

## 2. Papkalar tuzilmasi va arxitektura

### 2.1 [Junior] Papkalar qanday tuzilgan?

```
src/
├── main.jsx              # createRoot + StrictMode
├── App.jsx               # Provider'lar + barcha route'lar
├── index.css             # global stillar, CSS variable'lar
├── pages/                # route'ga to'g'ridan-to'g'ri ulangan ekranlar
│   ├── Homepage.jsx, Product.jsx, Pricing.jsx, Login.jsx, PageNotFound.jsx
│   ├── AppLayout.jsx     # /app ekranining skeleti
│   └── ProtectedRoute.jsx
├── components/           # UI bo'laklari, har birining yonida *.module.css
├── contexts/             # CitiesContext.jsx, FakeAuthContext.jsx
└── hooks/                # useGeolocation.js, useUrlPosition.js
```

**Javob:** Kod turiga qarab (by type) ajratilgan: `pages` — route'ga mos keladigan ekranlar, `components` — ularning bo'laklari, `contexts` — global state, `hooks` — qayta ishlatiladigan logika. Har komponentning stili yonidagi `.module.css` faylida turadi (co-location). Kichik loyiha uchun bu yetarli. Katta loyihada feature bo'yicha (`features/cities`, `features/auth`) ajratgan bo'lardim.

### 2.2 [Junior] `pages` va `components` ning farqi nima?

**Javob:** `pages` dagi komponent route'ning `element` iga beriladi va butun ekranni egallaydi (`Homepage`, `Login`). `components` dagilar o'sha ekranlarning qismlari: `Sidebar`, `Map`, `CityItem`, `Button`. `CityList`, `City`, `Form`, `CountryList` ham nested route element'lari, lekin ular `components` da turibdi, chunki ular butun ekran emas, Sidebar ichidagi bir bo'lak.

### 2.3 [Junior] `/app` ekranining komponentlar daraxtini chizib bering.

```jsx
// pages/AppLayout.jsx:9-13
<div className={styles.app}>
  <Sidebar />   {/* Logo + AppNav + <Outlet /> + copyright */}
  <Map />
  <User />
</div>
```

**Javob:** Uch bo'lak bor: chapda `Sidebar`, o'ngda `Map`, tepada absolute joylashgan `User` kartochkasi. URL'ga qarab `Sidebar` ichidagi `<Outlet />` ga `CityList`, `City`, `CountryList` yoki `Form` tushadi. Route almashganda xarita qayta mount bo'lmaydi, chunki u layout'ning doimiy qismi.

### 2.4 [Strong junior] State'ni qayerda saqlashni qanday hal qildingiz?

**Javob:** Uch qatlamga ajratdim:
- **Global (Context):** bir nechta komponentga kerak bo'ladigan ma'lumot. Bular `cities`, `currentCity`, `isLoading`, `error` (ularni CityList, CountryList, Map, Form, City ishlatadi) hamda `user` va `isAuth`.
- **Local (useState):** faqat bitta komponentga tegishli ma'lumot, masalan formadagi `cityName`, `date`, `notes` yoki xaritadagi `mapPosition`.
- **URL:** `lat`/`lng` query parametrlari va `:id` route parametri.

Qoidam shunday: state'ni uni ishlatadigan komponentga eng yaqin joyda saqlayman. Bir-biridan uzoq bir nechta komponentga kerak bo'lsagina Context'ga chiqaraman.

### 2.5 [Strong junior] Nega koordinatani state'da emas, URL'da saqladingiz?

```jsx
// components/CityItem.jsx:27
to={`${id}?lat=${position.lat}&lng=${position.lng}`}

// components/Map.jsx:83
click: (e) => navigate(`form?lat=${e.latlng.lat}&lng=${e.latlng.lng}`),
```

**Javob:** URL ham state'ning bir turi, faqat u global va bepul: istalgan komponent uni `useSearchParams` bilan o'qiy oladi, prop drilling ham, context ham kerak emas. Ustiga-ustak link'ni ulashish, sahifani yangilash va Back tugmasi ham ishlaydi. Shuning uchun Map ham, Form ham koordinatani bitta `useUrlPosition()` hook'idan oladi.

### 2.6 [Strong junior] Provider'lar `BrowserRouter` dan tashqarida turibdi. Bu nimaga ta'sir qiladi?

```jsx
// App.jsx:23-25
<AuthProvider>
  <CitiesProvider>
    <BrowserRouter>
```

**Javob:** Provider'lar router context'idan tashqarida bo'lgani uchun ular ichida `useNavigate` yoki `useLocation` ishlatib bo'lmaydi. Shuning uchun navigatsiya komponentlarning o'zida qilinadi (`Login`, `User`, `Form`). Ikkinchi oqibat: `CitiesProvider` butun ilovani o'ragani uchun shaharlar landing page'da, login'dan oldin ham fetch qilinadi. Uni faqat `/app` qismini o'raydigan qilib qo'yish to'g'riroq bo'lardi.

---

## 3. Routing

### 3.1 [Junior] Route'lar qanday tuzilgan? Nested route nima?

```jsx
// App.jsx:31-44
<Route path="app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route index element={<CityList />} />
  <Route path="cities" element={<CityList />} />
  <Route path="cities/:id" element={<City />} />
  <Route path="countries" element={<CountryList />} />
  <Route path="form" element={<Form />} />
</Route>
```

**Javob:** `app` — parent route, ichidagilari esa child route'lar. Child'ning path'i parent'ga nisbatan olinadi: `/app/cities`, `/app/form`. Parent element (`AppLayout`) doim render bo'ladi, child esa parent ichidagi `<Outlet />` o'rniga tushadi; bizda `<Outlet />` `Sidebar.jsx:11` da turibdi. Shuning uchun xarita va sidebar joyida qoladi, faqat sidebar'ning o'rta qismi almashadi.

### 3.2 [Junior] `index` route nima?

```jsx
// App.jsx:28 va App.jsx:39
<Route index element={<Homepage />} />
<Route index element={<CityList />} />
```

**Javob:** `index` route — URL'da child segment bo'lmaganda, ya'ni parent'ning o'z URL'ida chiqadigan default child. Top-level'da `/` ochilganda `Homepage`, `/app` ochilganda esa Sidebar'da `CityList` ko'rinadi. Bu yerda index route'dagi relative link bilan bog'liq bitta bug bor, u [11-bo'limda](#111-funksional-buglar) (#3).

### 3.3 [Junior] `path="*"` nima uchun kerak?

```jsx
// App.jsx:46
<Route path="*" element={<PageNotFound />} />
```

**Javob:** Bu catch-all route: hech qaysi route mos kelmasa, 404 sahifa chiqadi. Router eng aniq (most specific) mos route'ni tanlaydi, shuning uchun `*` boshqa variant qolmagandagina ishlaydi.

### 3.4 [Junior] `Link` va `NavLink` ning farqi nima? Qayerda ishlatgansiz?

```jsx
// components/AppNav.jsx:9
<NavLink to="cities">Cities</NavLink>
```
```css
/* components/AppNav.module.css:26 */
.nav a:global(.active) { background-color: var(--color-dark--0); }
```

**Javob:** Ikkalasi ham URL'ni sahifani qayta yuklamasdan almashtiradi (client-side navigation). `NavLink` bundan tashqari joriy URL'ga mos kelganda `active` class qo'shadi, shu bilan menyuda tanlangan bo'lim ko'rinadi. Shuning uchun navigatsiya menyularida (`AppNav`, `PageNav`) `NavLink`, oddiy o'tishlarda (`Logo`, `CityItem`, Homepage'dagi CTA) `Link` ishlatganman.

### 3.5 [Junior] Dinamik parametr qanday o'qiladi?

```jsx
// App.jsx:41
<Route path="cities/:id" element={<City />} />
// components/City.jsx:18
const { id } = useParams();
```

**Javob:** `:id` — dinamik segment. `useParams()` URL'dagi qiymatlarni obyekt qilib qaytaradi. Keyin `City` shu `id` bilan `getCity(id)` ni chaqiradi va server'dan shahar ma'lumotini oladi. Muhim jihat: `useParams` qiymatni doim **string** qilib qaytaradi.

### 3.6 [Junior] Programmatic navigation qayerlarda ishlatilgan?

```jsx
navigate("/app/cities");               // Form.jsx:75       — shahar saqlangandan keyin
navigate(-1);                          // BackButton.jsx:11 — tarixda bir qadam orqaga
navigate("/app", { replace: true });   // Login.jsx:21      — login'dan keyin
navigate("/");                         // User.jsx:20       — logout'dan keyin
```

**Javob:** `useNavigate()` qaytargan funksiya bilan. U foydalanuvchi link bosmasa-yu, biror amaldan keyin boshqa sahifaga o'tish kerak bo'lganda ishlatiladi. `navigate(-1)` brauzer tarixida bir qadam orqaga qaytaradi, shuning uchun BackButton foydalanuvchi qaysi sahifadan kelganini bilmasa ham ishlaydi.

### 3.7 [Strong junior] `replace: true` nima beradi?

**Javob:** History'ga yangi yozuv qo'shilmaydi, joriy yozuv almashtiriladi. Natijada login'dan keyin `/login` history'da qolmaydi va `/app` da Back bosgan foydalanuvchi qaytib login sahifasiga tushib qolmaydi.

### 3.8 [Strong junior] Relative va absolute path farqi nima? Loyihadan misol keltiring.

```jsx
<NavLink to="/pricing">     // PageNav.jsx:11 — absolute
<NavLink to="cities">       // AppNav.jsx:9   — relative → /app/cities
navigate(`form?lat=...`)    // Map.jsx:83     — relative → /app/form
```

**Javob:** Path `/` bilan boshlansa, absolute bo'ladi va ildizdan hisoblanadi. Aks holda joriy route'ga nisbatan resolve qilinadi. `AppNav` va `Map` `app` route'i ichida render bo'lgani uchun `"cities"` `/app/cities` ga aylanadi. Afzalligi shundaki, parent path o'zgarsa (masalan, `app` o'rniga `dashboard`), ichki link'larni o'zgartirish shart emas.

### 3.9 [Strong junior] `ProtectedRoute` qanday ishlaydi?

```jsx
// pages/ProtectedRoute.jsx:5-12
function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuth) navigate("/login");
  }, [isAuth, navigate]);
  return isAuth ? children : null;
}
```

**Javob:** Bu `AppLayout` ni o'raydigan wrapper komponent. U `isAuth` ni tekshiradi: login qilinmagan bo'lsa, effect ichida `/login` ga yo'naltiradi, render'da esa `null` qaytaradi. `null` muhim, chunki effect render'dan **keyin** ishlaydi; usiz redirect bo'lgunicha `AppLayout` bir lahza render bo'lib, uning effect'lari ham ishlab ketardi. Soddaroq yo'li bor: render'ning o'zida `<Navigate to="/login" replace />` qaytarish.

### 3.10 [Strong junior] `lazy` + `Suspense` qanday ishlaydi?

```jsx
// App.jsx:13-18
const AppLayout = lazy(() => import("./pages/AppLayout"));
// App.jsx:26
<Suspense fallback={<SpinnerFullPage />}>
  <Routes>...</Routes>
</Suspense>
```

**Javob:** Dinamik `import()` Vite'ga shu modulni alohida faylga ajratishni bildiradi (code splitting). `lazy` komponentni u birinchi marta render bo'lgandagina yuklaydi. Yuklanish davomida komponent "suspend" bo'ladi va eng yaqin `Suspense` boundary `fallback` ni, ya'ni `SpinnerFullPage` ni ko'rsatadi. `lazy` faqat `default export` bilan ishlaydi, shuning uchun barcha sahifalar `export default` qiladi.

### 3.11 [Middle] Nega faqat sahifalar lazy? `CityList`, `Form` va boshqalar-chi?

```jsx
// App.jsx:3-6 — oddiy (eager) import
import CityList from "./components/CityList";
import CountryList from "./components/CountryList";
import City from "./components/City";
import Form from "./components/Form";
```

**Javob:** Sahifa darajasida bo'lish eng sodda va eng ko'p foyda beradigan strategiya, chunki har bir route o'z chunk'iga ega bo'ladi. Lekin bu to'rt komponent `App.jsx` da eager import qilingan, shuning uchun ular asosiy bundle'ga tushadi. `Form` esa o'zi bilan `react-datepicker` ning JS va CSS'ini ham olib kiradi, bu build natijasida ko'rinadi. Bu komponentlar faqat `/app` ichida kerak, shuning uchun ularni ham lazy qilish mumkin.

### 3.12 [Middle] Bitta `Suspense` butun `Routes` ni o'rab turibdi. Buning kamchiligi bormi?

**Javob:** Istalgan lazy sahifa yuklanayotganda butun ekran full-page spinner bilan almashadi. Hozircha bu yaxshi, chunki lazy qilinganlarning hammasi butun sahifa. Agar nested route'lar ham lazy bo'lsa, ular uchun `Sidebar` ichiga alohida `Suspense` qo'yardim: shunda xarita va sidebar ko'rinib turadi, spinner faqat o'rta qismda chiqadi.

---

## 4. Context: CitiesContext va AuthContext

### 4.1 [Junior] Context API nima uchun kerak bo'ldi?

**Javob:** `cities` ro'yxati `CityList`, `CountryList`, `Map`, `CityItem`, `City` va `Form` ga kerak, bu komponentlar esa daraxtning turli shoxlarida joylashgan. Ma'lumotni props orqali uzatsam, oraliqdagi `AppLayout` va `Sidebar` o'zlariga kerak bo'lmagan props'ni tashib yurardi (prop drilling). Context bilan istalgan komponent ma'lumotni `useCities()` orqali to'g'ridan-to'g'ri oladi.

### 4.2 [Strong junior] CitiesContext'da nega `useState` emas, `useReducer`?

```jsx
// contexts/CitiesContext.jsx:64-70
const [{ cities, isLoading, currentCity, error }, dispatch] = useReducer(reducer, initialState);
// const [cities, setCities] = useState([]);
// const [isLoading, setIsLoading] = useState(false);
// const [currentCity, setCurrentCity] = useState({});
```

**Javob:** Avval uchta `useState` edi, ular hali ham izohda turibdi. Muammo shundaki, har bir amal bir nechta state'ni birga o'zgartiradi: masalan, shahar yaratilganda `isLoading`, `cities` va `currentCity` bir vaqtda yangilanishi kerak. `useReducer` bilan bu bitta `dispatch({ type: "city/created" })` bo'ladi. Barcha state o'tishlari bir joyda, natijani oldindan bilish va testlash oson. Action nomlari (`"cities/loaded"`, `"city/deleted"`) qaysi setter chaqirilganini emas, nima sodir bo'lganini bildiradi.

### 4.3 [Strong junior] Nega `fetch` reducer ichida emas?

**Javob:** Reducer pure function bo'lishi kerak: bir xil `state` va `action` doim bir xil natija beradi va hech qanday side effect yo'q. Network request esa side effect. Shuning uchun async ish provider'dagi `getCity`, `createCity`, `deleteCity` funksiyalarida bajariladi, ular natijaga qarab `dispatch` qiladi. Bu Redux'dagi thunk'larga o'xshash pattern.

### 4.4 [Strong junior] Reducer'dagi `default: throw` nima uchun?

```jsx
// contexts/CitiesContext.jsx:57-58
default:
  throw new Error("Unknown action type");
```

**Javob:** Action type'ni xato yozsam (masalan, `"city/create"`), state jimgina o'zgarmay qolmaydi, darhol xato chiqadi. Bug tezroq topiladi.

### 4.5 [Strong junior] `useCities` hook'idagi tekshiruv nima uchun?

```jsx
// contexts/CitiesContext.jsx:161-166
function useCities() {
  const context = useContext(CitiesContext);
  if (context === undefined)
    throw new Error("CitiesContext was used outside the CitiesProvider");
  return context;
}
```

**Javob:** `createContext()` default qiymatsiz chaqirilgan, shuning uchun provider tashqarisida `useContext` `undefined` qaytaradi. Tekshiruv bo'lmasa, bu keyinroq tushunarsiz `Cannot read properties of undefined` xatosiga aylanardi. Ikkinchi foydasi: komponentlar `CitiesContext` obyektini emas, faqat `useCities` ni import qiladi, ya'ni context ichki implementatsiya bo'lib qoladi (encapsulation).

### 4.6 [Strong junior] AuthContext qanday tuzilgan va nega "Fake"?

```jsx
// contexts/FakeAuthContext.jsx:36-42
function login(email, password) {
  if (email === FAKE_USER.email && password === FAKE_USER.password)
    dispatch({ type: "login", payload: FAKE_USER });
}
function logOut() {
  dispatch({ type: "logout" });
}
```

**Javob:** State `user` va `isAuth` dan, amallar `login` va `logOut` dan iborat. Haqiqiy backend hozircha yo'q, shuning uchun email va parol kod ichidagi `FAKE_USER` bilan solishtiriladi. Dizaynning afzalligi shundaki, context'ning tashqi API'si (`user`, `isAuth`, `login`, `logOut`) haqiqiy auth'ga o'tganda ham o'zgarmaydi: faqat `login` ichida API'ga request yuboriladi, komponentlarga tegish shart emas.

### 4.7 [Strong junior] Login'dan keyin nega `navigate` darhol emas, `useEffect` ichida chaqiriladi?

```jsx
// pages/Login.jsx:14-22
function handleSubmit(e) {
  e.preventDefault();
  if (email && login) login(email, password);
}
useEffect(() => {
  if (isAuth) return navigate("/app", { replace: true });
}, [isAuth, navigate]);
```

**Javob:** `login()` muvaffaqiyatli bo'lishi ham, bo'lmasligi ham mumkin, lekin u natija qaytarmaydi. `dispatch` dan keyin ham shu closure'dagi `isAuth` eski qiymatda qoladi. Effect esa haqiqiy state o'zgarishiga reaksiya qiladi: `isAuth` `true` bo'lishi bilan yo'naltiradi. Qo'shimcha foyda: allaqachon login qilgan foydalanuvchi `/login` ga kirsa ham avtomatik `/app` ga o'tkaziladi.

### 4.8 [Middle] Nega bitta katta context emas, ikkita alohida?

**Javob:** Bu ikki mustaqil domen, ya'ni separation of concerns. Re-render jihatidan ham foydali: komponent faqat o'zi o'qigan context'ga obuna bo'ladi. Shuning uchun `useAuth` ishlatadigan komponent shaharlar o'zgarganda, `useCities` ishlatadigani esa login holati o'zgarganda context sababli qayta render bo'lmaydi. `AuthProvider` state'i o'zgarganda `CitiesProvider` ham qayta render bo'lmaydi, chunki u `children` sifatida o'sha element reference bilan keladi.

### 4.9 [Middle] Context'ning performance kamchiligi nimada? Sizning kodingizda shunday holat bormi?

```jsx
// contexts/CitiesContext.jsx:145-154
<CitiesContext.Provider
  value={{ cities, isLoading, currentCity, getCity, createCity, deleteCity, error }}
>
```

**Javob:** Bor. `value` har render'da yangi obyekt bo'ladi, `createCity` va `deleteCity` ham har safar yangi funksiya. Shuning uchun provider qayta render bo'lganda `useCities` ishlatadigan barcha komponentlar ham qayta render bo'ladi. Hozir provider faqat o'z state'i o'zgarganda render bo'lgani uchun bu amalda sezilmaydi. Yechimlari: `value` ni `useMemo` ga, funksiyalarni `useCallback` ga o'rash yoki state va funksiyalarni ikki alohida context'ga bo'lish. Katta loyihada selector'lari bor Redux Toolkit yoki Zustand ishlatgan bo'lardim.

---

## 5. Custom hook'lar

### 5.1 [Junior] Custom hook nima va uning qanday qoidalari bor?

**Javob:** Custom hook — nomi `use` bilan boshlanadigan va ichida boshqa hook'larni chaqiradigan oddiy funksiya. U UI'ni emas, logikani qayta ishlatish uchun kerak. Qoidalari oddiy hook'larniki bilan bir xil: faqat komponent yoki boshqa hook'ning yuqori darajasida chaqiriladi, shart yoki sikl ichida chaqirilmaydi. Loyihada to'rtta custom hook bor: `useGeolocation`, `useUrlPosition` hamda context'lar uchun `useCities` va `useAuth`.

### 5.2 [Strong junior] `useGeolocation` ni tushuntirib bering.

```js
// hooks/useGeolocation.js:8-28
function getPosition() {
  if (!navigator.geolocation)
    return setError("Your browser does not support geolocation");
  setIsLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setIsLoading(false);
    },
    (error) => {
      setError(error.message);
      setIsLoading(false);
    },
  );
}
return { isLoading, position, error, getPosition };
```

**Javob:** Hook brauzerning callback'larga asoslangan Geolocation API'sini React uchun qulay interfeysga o'raydi: `isLoading`, `position`, `error` state'lari va `getPosition` funksiyasi. Joylashuv mount paytida emas, foydalanuvchi "use your position" tugmasini bosgandagina so'raladi, chunki bu brauzerda ruxsat oynasini ochadi. `Map.jsx:20-24` da qiymatlar qayta nomlanadi (`position: geolocationPosition`), bu bitta komponentda bir xil nomlar to'qnashmasligi uchun.

### 5.3 [Strong junior] Nega `useUrlPosition` massiv qaytaradi?

```js
// hooks/useUrlPosition.js:3-8
export function useUrlPosition() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  return [lat, lng];
}
```

**Javob:** Massiv, xuddi `useState` dagidek, chaqiruvchiga qiymatlarni xohlagan nom bilan olish imkonini beradi: `Map.jsx` da `[mapLat, mapLng]`, `Form.jsx` da `[lat, lng]`. Qiymatlar ikkitadan ko'p bo'lsa, obyekt qulayroq. Bir narsani esda tutish kerak: `searchParams.get` doim **string** yoki `null` qaytaradi, shuning uchun raqam kerak bo'lsa, `Number()` bilan o'girish kerak.

### 5.4 [Middle] Ikki komponent bitta custom hook'ni chaqirsa, state umumiy bo'ladimi?

**Javob:** Yo'q. Har bir chaqiruv o'zining alohida state'ini yaratadi: hook logikani ulashadi, state'ni emas. `useUrlPosition` da Map va Form bir xil qiymatni ko'rishining sababi manbaning umumiyligi, ya'ni ikkalasi ham URL'dan o'qiydi. State'ni ulashish kerak bo'lsa, Context ishlatiladi (masalan, `useCities`).

---

## 6. Ma'lumot yuklash

### 6.1 [Junior] Ma'lumot qayerdan keladi?

```json
// package.json
"server": "json-server --watch data/cities.json --port 9000"
```
```js
// contexts/CitiesContext.jsx:9
const BASE_URL = "http://localhost:9000";
```

**Javob:** `json-server` `data/cities.json` faylidan avtomatik REST API yasab beradi. Endpoint'lar: `GET /cities` (ro'yxat), `GET /cities/:id` (bitta shahar), `POST /cities` (yaratish) va `DELETE /cities/:id` (o'chirish). Bu frontend'ni haqiqiy backend'siz ishlab chiqish uchun qulay. Ikkinchi tashqi API — BigDataCloud reverse geocoding (`Form.jsx:24`).

### 6.2 [Junior] Nega `useEffect` callback'ining o'zi `async` emas?

```jsx
// contexts/CitiesContext.jsx:72-87
useEffect(() => {
  async function fetchCities() { /* ... */ }
  fetchCities();
}, []);
```

**Javob:** `async` funksiya doim Promise qaytaradi, `useEffect` esa callback'dan hech narsa qaytarmaslikni yoki cleanup funksiya qaytarishni kutadi. Shuning uchun ichida alohida async funksiya yaratib, uni darhol chaqiraman. `[]` dependency effect faqat mount paytida bir marta ishlashini bildiradi.

### 6.3 [Strong junior] Development'da shaharlar ikki marta fetch qilinadi. Nega?

```jsx
// main.jsx:5-9
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**Javob:** React 18+ da `StrictMode` development'da har bir komponentni mount → unmount → mount qilib ko'radi, shuning uchun effect'lar ikki marta ishlaydi. Maqsad — cleanup'i yo'q effect'larni fosh qilish. Production build'da bunday bo'lmaydi. To'g'ri yechim StrictMode'ni o'chirish emas, effect'ga cleanup qo'shish (masalan, AbortController).

### 6.4 [Strong junior] Xatolar qanday ushlanadi? Kamchiligi bormi?

```jsx
// contexts/CitiesContext.jsx:75-84
try {
  const res = await fetch(`${BASE_URL}/cities`);
  const data = await res.json();
  dispatch({ type: "cities/loaded", payload: data });
} catch {
  dispatch({ type: "rejected", payload: "Something wrong with loading cities..." });
}
```

**Javob:** `try/catch` va `"rejected"` action bilan. Lekin ikki kamchilik bor. Birinchisi: `fetch` faqat network xatosida reject bo'ladi, 404 yoki 500 da emas, shuning uchun `if (!res.ok) throw new Error(...)` kerak. Ikkinchisi: `error` state'ga yoziladi, lekin uni hech qaysi komponent ko'rsatmaydi. Tuzatish uchun `CityList` ga `if (error) return <Message message={error} />` qo'shish kerak.

### 6.5 [Strong junior] Shahar qo'shilgandan keyin ro'yxat qanday yangilanadi?

```jsx
// contexts/CitiesContext.jsx:35-41
case "city/created":
  return {
    ...state,
    isLoading: false,
    cities: [...state.cities, action.payload],
    currentCity: action.payload,
  };
```

**Javob:** Butun ro'yxatni qayta fetch qilmayman. Server qaytargan obyektni (endi unda `id` bor) mavjud massivga immutable tarzda qo'shaman, o'chirishda esa `filter` qilaman. Bu **pessimistic update**: UI server tasdiqlagandan keyingina yangilanadi. Optimistic variantda UI darhol yangilanadi va xato bo'lsa orqaga qaytariladi; u tezroq tuyuladi, lekin murakkabroq.

### 6.6 [Strong junior] Formadagi reverse geocoding qanday ishlaydi?

```jsx
// components/Form.jsx:42-51
const res = await fetch(`${BASE_URL}?latitude=${lat}&longitude=${lng}`);
const data = await res.json();
if (!data.countryCode)
  throw new Error("That doesn't seem to be a city. Click somewhere else 😉");
setCityName(data.city || data.locality || "");
setCountry(data.countryName || data.locality || "");
setEmoji(convertToEmoji(data.countryCode));
```

**Javob:** `lat` yoki `lng` o'zgarganda effect API'dan joy nomini oladi. Dengiz bosilganda API `countryCode` qaytarmaydi; bu holatda o'zim `throw` qilaman va `catch` da foydalanuvchiga tushunarli xabar ko'rsataman. `finally` esa loading'ni har qanday holatda o'chiradi.

### 6.7 [Middle] Formadagi fetch'da race condition bo'lishi mumkinmi?

**Javob:** Ha. Xaritaning ikki joyini tez-tez bossam, ikkita request ketadi. Agar birinchisi kechroq qaytsa, formada eski shahar nomi qolib ketadi. Hozirgi kodda bunga himoya yo'q. Yechim — `AbortController`: effect cleanup'ida `controller.abort()` chaqiriladi, `fetch` ga `{ signal }` beriladi, `catch` da esa `AbortError` e'tiborsiz qoldiriladi.

### 6.8 [Middle] Nega React Query ishlatmadingiz?

**Javob:** Loyihaning maqsadi server state'ni Context + useReducer bilan qo'lda boshqarishni o'rganish edi. Lekin kodda React Query avtomatik hal qiladigan muammolar ko'rinib turibdi: `isLoading` va `error` qo'lda yuritiladi, cache yo'q (`getCity` dagi cache tekshiruvi ishlamaydi, [11-bo'lim](#111-funksional-buglar), #2), request'lar bekor qilinmaydi, avtomatik qayta fetch ham yo'q. Haqiqiy loyihada server state'ni React Query'ga, client state'ni (auth, UI) Context'ga ajratardim.

---

## 7. Performance

### 7.1 [Strong junior] `getCity` nega `useCallback` ga o'ralgan?

```jsx
// contexts/CitiesContext.jsx:89-106
const getCity = useCallback(
  async function getCity(id) {
    if (Number(id) === currentCity.id) return;
    // ...fetch + dispatch
  },
  [currentCity.id],
);
```
```jsx
// components/City.jsx:21-23
useEffect(() => {
  getCity(id);
}, [id]);
```

**Javob:** `getCity` `City` dagi `useEffect` ichida chaqiriladi, qoidaga ko'ra esa u dependency array'da bo'lishi kerak. `useCallback` bo'lmasa, provider har render bo'lganda yangi funksiya yaratiladi: effect qayta ishlaydi, `dispatch` provider'ni qayta render qiladi, yana yangi funksiya paydo bo'ladi va cheksiz loop boshlanadi. `useCallback` funksiya reference'ini barqaror qiladi. To'g'risini aytsam, hozir `City.jsx` da dependency faqat `[id]`, ESLint `getCity` yo'qligi haqida ogohlantiradi; to'g'ri varianti `[id, getCity]`.

### 7.2 [Strong junior] Nega `createCity` va `deleteCity` `useCallback` siz?

**Javob:** `useCallback` reference barqarorligi muhim bo'lgandagina kerak: funksiya effect dependency'si bo'lsa yoki `memo` qilingan bola komponentga prop sifatida berilsa. Bu ikki funksiya faqat event handler'larda chaqiriladi, shuning uchun ularni o'rash amalda foyda bermaydi. Har bir funksiyani avtomatik `useCallback` ga o'rashning o'zi ham xarajat. Agar context `value` ni `useMemo` qilsam, ana shunda ularni ham o'rash kerak bo'ladi.

### 7.3 [Strong junior] Lazy loading qanday natija berdi?

**Javob:** Build'da har bir sahifa alohida chunk'da: `Homepage` ~0.7 kB, `Login` ~1.1 kB, `AppLayout` ~156 kB (Leaflet va react-leaflet shu yerda). Landing page'ga kirgan foydalanuvchi Leaflet'ni umuman yuklamaydi. Asosiy `index` chunk ~445 kB (gzip'da ~131 kB). Unda React, React DOM, router va eager import qilingan komponentlar bor.

### 7.4 [Middle] `React.memo` yoki `useMemo` ishlatdingizmi?

**Javob:** Yo'q, kodda `memo` ham, `useMemo` ham yo'q. Bu yerda ular shart emas: ro'yxatlar kichik va o'lchab ko'rilgan performance muammosi yo'q. Bir nozik jihat bor: `CityItem` ni `memo` ga o'rash bu yerda yordam bermaydi, chunki u ichida `useCities()` ni chaqiradi. `memo` faqat props o'zgarishidan himoya qiladi, context o'zgarsa komponent baribir qayta render bo'ladi. Optimizatsiya qilishdan oldin React DevTools Profiler bilan o'lchab ko'raman.

### 7.5 [Strong junior] `CountryList` da davlatlar ro'yxati state'da saqlanmaydi. Nega?

```jsx
// components/CountryList.jsx:16-22
const country = cities.reduce((arr, city) => {
  if (!arr.map((el) => el.country).includes(city.country))
    return [...arr, { country: city.country, emoji: city.emoji }];
  else return arr;
}, []);
```

**Javob:** Bu derived state, u `cities` dan hisoblanadi. Uni alohida `useState` da saqlasam, ikki state'ni sinxron ushlab turishga to'g'ri kelardi va bug chiqish xavfi oshardi. Bu hajmda har render'da qayta hisoblash arzon. Yaxshilash mumkin: hozirgi algoritm O(n²) (har qadamda `map` + `includes`), `Set` yoki `Map` bilan O(n) bo'ladi. Ro'yxat juda katta bo'lsa, `useMemo` ham qo'shish mumkin.

---

## 8. Forma va xarita

### 8.1 [Junior] Controlled input nima? Loyihadan misol keltiring.

```jsx
// components/Form.jsx:88-92
<input
  id="cityName"
  onChange={(e) => setCityName(e.target.value)}
  value={cityName}
/>
```

**Javob:** Controlled input'ning qiymati React state'dan keladi (`value`), har bir o'zgarish esa `onChange` orqali state'ga yoziladi. Shunday qilib yagona haqiqat manbai (single source of truth) React state bo'ladi. Bu validatsiya, formatlash va boshlang'ich qiymat berishni osonlashtiradi. Masalan, `cityName` API'dan avtomatik to'ldiriladi, lekin foydalanuvchi uni tahrirlay oladi.

### 8.2 [Junior] `handleSubmit` dagi `e.preventDefault()` nima uchun?

**Javob:** HTML forma submit qilinganda brauzer sahifani qayta yuklaydi. SPA'da bu butun state'ni yo'qotadi. Shuning uchun default xatti-harakatni to'xtataman va ma'lumotni JavaScript orqali o'zim yuboraman.

### 8.3 [Strong junior] `BackButton` da ham `e.preventDefault()` bor. Nega?

```jsx
// components/BackButton.jsx:9-12
onClick={(e) => {
  e.preventDefault();
  navigate(-1);
}}
// components/Button.jsx:5
<button className={`${styles.btn} ${styles[type]}`} onClick={onClick}>
```

**Javob:** `BackButton` `<form>` ichida joylashgan. `<button>` ning default `type` i `"submit"`, mening `Button` komponentim esa HTML `type` atributini o'rnatmaydi: `type` prop'i faqat stil variantini (`primary`, `back`, `position`) tanlaydi. `preventDefault` bo'lmasa, "Back" bosilganda forma submit bo'lib, shahar qo'shilib ketardi. To'g'ri yechim — prop'ni `variant` deb qayta nomlash va Back tugmasiga `type="button"` berish.

### 8.4 [Strong junior] Formadagi bir nechta `return` hook qoidalarini buzmaydimi?

```jsx
// components/Form.jsx:77-80
if (isLoadingGeocoding) return <Spinner />;
if (!lat && !lng)
  return <Message message="Start by clicking somewhere on the map" />;
if (geocodingError) return <Message message={geocodingError} />;
```

**Javob:** Yo'q, chunki barcha hook'lar (`useState`, `useUrlPosition`, `useCities`, `useNavigate`, `useEffect`) early return'lardan **oldin** chaqirilgan. Qoida shuki, hook'lar har render'da bir xil tartibda chaqirilishi kerak. Hook early return'dan keyin qo'yilsa, ba'zi render'larda u chaqirilmay qoladi va React xato beradi.

### 8.5 [Junior] Sana qanday tanlanadi va qanday ko'rsatiladi?

```jsx
// components/Form.jsx:98-103
<DatePicker
  id="date"
  onChange={(date) => setDate(date)}
  selected={date}
  dateFormat="dd/MM/yyyy"
/>
// components/City.jsx:9-15
const formatDate = (date) =>
  new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", weekday: "long" })
    .format(new Date(date));
```

**Javob:** Sana `react-datepicker` bilan kiritiladi, u ham controlled: `selected` va `onChange`. State'da `Date` obyekti saqlanadi, `JSON.stringify` esa uni ISO string'ga aylantiradi (`"2026-10-02T10:57:47.165Z"`). Ko'rsatish uchun brauzerga o'rnatilgan `Intl.DateTimeFormat` ishlatiladi, u qo'shimcha kutubxonasiz lokalizatsiyalangan format beradi.

### 8.6 [Strong junior] `convertToEmoji` qanday ishlaydi?

```jsx
// components/Form.jsx:16-22
export function convertToEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
```

**Javob:** Bayroq emoji'si ikkita "Regional Indicator Symbol" belgisidan iborat. `"A"` harfining kodi 65, 🇦 indikatoriniki 127462, farqi 127397. Har bir harfni shu offset'ga surib, ikki belgini birlashtirsam, masalan `"DE"` 🇩🇪 ga aylanadi. Windows bayroq emoji'larini chizmaydi, u yerda ularning o'rnida ikkita harf ko'rinadi.

### 8.7 [Strong junior] Xarita qanday qurilgan?

```jsx
// components/Map.jsx:43-69 (qisqartirilgan)
<MapContainer center={mapPosition} zoom={13} scrollWheelZoom={true} className={styles.map}>
  <TileLayer url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" /* attribution */ />
  {cities.map((city) => (
    <Marker position={[city.position.lat, city.position.lng]} key={city.id}>
      <Popup>
        <span>{city.emoji}</span>
        <span>{city.cityName}</span>
      </Popup>
    </Marker>
  ))}
  <ChangeCenter position={mapPosition} />
  <DetectClick />
</MapContainer>
```

**Javob:** `react-leaflet` Leaflet ustidagi deklarativ qatlam. `TileLayer` OpenStreetMap plitkalarini chizadi, har bir shahar uchun esa `Marker` va `Popup` bor. Marker'lar `cities` context'idan olinadi, shuning uchun yangi shahar qo'shilishi bilan xaritada avtomatik paydo bo'ladi.

### 8.8 [Strong junior] Nega `center` prop'i yetmaydi va `ChangeCenter` kerak bo'ldi?

```jsx
// components/Map.jsx:74-78
function ChangeCenter({ position }) {
  const map = useMap();
  map.setView(position);
  return null;
}
```

**Javob:** `MapContainer` prop'larini faqat birinchi mount paytida ishlatadi, keyin `center` o'zgarsa ham xarita siljimaydi. Shuning uchun `MapContainer` ichiga kichik komponent qo'ydim: u `useMap()` orqali Leaflet instance'ini oladi va `setView` ni imperativ chaqiradi. Komponent hech narsa chizmaydi (`return null`), u faqat xarita context'iga kirish uchun kerak. Yaxshilash mumkin: render pure bo'lishi kerak, shuning uchun `setView` ni render ichida emas, `useEffect` da chaqirgan ma'qul.

### 8.9 [Strong junior] Xaritani bosish formani qanday ochadi?

```jsx
// components/Map.jsx:80-85
function DetectClick() {
  const navigate = useNavigate();
  useMapEvents({
    click: (e) => navigate(`form?lat=${e.latlng.lat}&lng=${e.latlng.lng}`),
  });
}
```

**Javob:** `useMapEvents` Leaflet event'lariga obuna bo'ladi. Click bo'lganda koordinatani URL'ga yozib, `form` route'iga o'taman. `Form` koordinatani `useUrlPosition` orqali o'qiydi va geocoding'ni boshlaydi. Map va Form bir-birini bilmaydi, ular URL orqali bog'lanadi.

### 8.10 [Middle] Xarita markazi qayerlardan o'zgaradi? Oqimni tushuntiring.

```jsx
// components/Map.jsx:28-35
useEffect(() => {
  if (mapLat && mapLng) setMapPosition([mapLat, mapLng]);
}, [mapLat, mapLng]);

useEffect(() => {
  if (geolocationPosition)
    setMapPosition([geolocationPosition.lat, geolocationPosition.lng]);
}, [geolocationPosition]);
```

**Javob:** Markaz ikki manbadan o'zgaradi: URL'dan (ro'yxatdagi shahar yoki xarita bosilganda) va geolokatsiya tugmasidan. Ikkalasi `mapPosition` local state'ga yoziladi, u esa `ChangeCenter` orqali xaritaga uzatiladi. `mapPosition` oxirgi pozitsiyani eslab qoladi, shuning uchun shahar sahifasidan ro'yxatga qaytganda xarita sakramaydi. Biroq ESLint'ning `react-hooks/set-state-in-effect` qoidasi ikkala effect'ni ham xato deb belgilaydi, chunki effect ichidagi sinxron `setState` qo'shimcha render beradi. Muqobil yo'l: geolokatsiya natijasini ham `setSearchParams` bilan URL'ga yozish va pozitsiyani faqat URL'dan derive qilish.

### 8.11 [Strong junior] `CityItem` dagi o'chirish tugmasi `Link` ichida turibdi. Bu qanday ishlaydi?

```jsx
// components/CityItem.jsx:18-21
function handleDelete(e) {
  e.preventDefault();
  deleteCity(id);
}
// components/CityItem.jsx:32-34
<button className={styles.deleteBtn} onClick={handleDelete}>
  &times;
</button>
```

**Javob:** Tugma `Link` (ya'ni `<a>`) ichida bo'lgani uchun click `<a>` ga ham yetib boradi va o'z holicha shahar sahifasiga o'tib ketadi. `preventDefault` link'ning default navigatsiyasini to'xtatadi. Lekin HTML standarti `<a>` ichida `<button>` bo'lishiga ruxsat bermaydi (interactive content ichida interactive content). Accessibility uchun tugmani `Link` dan chiqarib, uning yoniga qo'yish to'g'riroq.

---

## 9. Stillash

### 9.1 [Junior] CSS Modules nima va nega uni tanladingiz?

```jsx
// components/Button.jsx:2-5
import styles from "./Button.module.css";
<button className={`${styles.btn} ${styles[type]}`} onClick={onClick}>
```

**Javob:** `.module.css` faylidagi class'lar build paytida noyob nomlarga aylanadi. Shuning uchun `Form.module.css` va `Login.module.css` dagi ikkita `.row` bir-biri bilan to'qnashmaydi. Oddiy CSS yozaveraman, faqat uning scope'i lokal bo'ladi. Vite'da bu qo'shimcha sozlamasiz ishlaydi.

### 9.2 [Strong junior] `:global` ni qayerda va nega ishlatdingiz?

```css
/* components/Map.module.css:13 */
:global(.leaflet-popup .leaflet-popup-content-wrapper) { /* ... */ }
/* components/Form.module.css:41 */
:global(.react-datepicker) { font-family: inherit; font-size: 1.2rem; }
/* components/AppNav.module.css:26 */
.nav a:global(.active) { background-color: var(--color-dark--0); }
```

**Javob:** CSS Modules class nomlarini hash qiladi, Leaflet, react-datepicker va `NavLink` esa o'z class'larini (`leaflet-popup`, `react-datepicker`, `active`) o'zgarmagan holda qo'shadi. `:global` bu nomni hash qilmaslikni bildiradi. `.nav a:global(.active)` eng yaxshi kombinatsiya: `.nav` lokal qoladi, shuning uchun `active` stili faqat shu navigatsiya ichida ishlaydi.

### 9.3 [Junior] Global stillar qayerda?

```css
/* index.css:6-16 */
:root {
  --color-brand--1: #ffb545;
  --color-brand--2: #00c46a;
  /* ... */
}
/* index.css:24-27 */
html { font-size: 62.5%; box-sizing: border-box; }
```

**Javob:** `index.css` `main.jsx` da bir marta import qilinadi. Unda reset, CSS variable'lar (ranglar), font va input'larning umumiy stillari bor. CSS variable'lar global, shuning uchun `var(--color-brand--2)` barcha module fayllarda ishlaydi. `font-size: 62.5%` bilan `1rem = 10px` bo'ladi: hisoblash oson va foydalanuvchining brauzerdagi shrift sozlamasi hisobga olinadi. `.cta` bir nechta joyda ishlatiladigan global class, Homepage'da u `className="cta"` bilan ulanadi.

### 9.4 [Strong junior] Dinamik va shartli class'lar qanday beriladi?

```jsx
// components/CityItem.jsx:26
className={`${styles.cityItem} ${currentCity.id === id ? styles["cityItem--active"] : ""}`}
// components/Form.jsx:83
className={`${styles.form} ${isLoading ? styles.loading : ""}`}
```

**Javob:** Template literal bilan. Class nomida chiziqcha bor (`cityItem--active`), shuning uchun u nuqta orqali emas, bracket notation bilan olinadi. `Button` dagi `styles[type]` prop qiymatiga qarab variant class'ni tanlaydi. Shartli class'lar ko'p bo'lsa, `clsx` kutubxonasi qulayroq.

### 9.5 [Strong junior] Leaflet CSS va font `index.css` da `@import` URL bilan ulangan. Bu yaxshimi?

```css
/* index.css:2-3 */
@import "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
@import "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap";
```

**Javob:** Bu ishlaydi, lekin ideal emas. CSS ichidagi `@import` fayllarni ketma-ket yuklaydi va render'ni bloklaydigan zanjir hosil qiladi, ustiga-ustak loyiha unpkg CDN'ga bog'lanib qoladi. `leaflet` npm'da o'rnatilgan, shuning uchun `Map.jsx` da `import "leaflet/dist/leaflet.css"` qilsam, CSS Vite orqali faqat `AppLayout` chunk'iga tushadi. Font uchun `index.html` dagi `<link rel="preconnect">` va `<link>` tezroq ishlaydi.

---

## 10. Build va deploy

### 10.1 [Junior] Loyiha qanday build qilinadi?

**Javob:** `npm run build` buyrug'i `vite build` ni ishga tushiradi va `dist/` papkaga statik fayllar chiqaradi: `index.html`, hash'li JS/CSS chunk'lar va `public/` dagi rasmlar. Natijani `npm run preview` bilan lokal tekshirish mumkin. `dist` `.gitignore` ga qo'shilgan, chunki u har safar koddan qayta yasaladi va repo'da saqlanmaydi.

### 10.2 [Strong junior] Fayl nomlaridagi hash (`AppLayout-Cc35UH15.js`) nima uchun kerak?

**Javob:** Hash fayl tarkibidan hisoblanadi. Shuning uchun server bu fayllarni uzoq muddat cache qila oladi: kod o'zgarsa, nom ham o'zgaradi va brauzer yangi faylni yuklaydi. `index.html` esa cache qilinmasligi kerak, chunki u doim eng yangi hash'larga ishora qiladi.

### 10.3 [Strong junior] Netlify yoki Vercel'da `/app/cities` sahifasini yangilasam, 404 chiqadi. Nega?

**Javob:** `BrowserRouter` client-side routing qiladi: serverda `/app/cities` degan fayl yo'q, faqat `index.html` bor. Sahifa yangilanganda brauzer serverdan aynan shu path'ni so'raydi. Yechim — barcha path'larni `index.html` ga rewrite qilish: Netlify'da `public/_redirects` fayliga `/*  /index.html  200` yoziladi, Vercel'da esa `vercel.json` ga `rewrites` qo'shiladi. Loyihada hozircha bunday fayl yo'q, uni deploy'dan oldin qo'shish kerak.

### 10.4 [Strong junior] Production'da API manzili qanday bo'ladi?

```js
// contexts/CitiesContext.jsx:9
const BASE_URL = "http://localhost:9000";
```

**Javob:** Hozir manzil hardcode qilingan va faqat lokal ishlaydi. To'g'ri yo'l — environment variable: `.env` faylida `VITE_API_URL=...`, kodda esa `import.meta.env.VITE_API_URL`. Vite client kodiga faqat `VITE_` prefiksli o'zgaruvchilarni beradi. Yana bir masala: json-server statik hostingda ishlamaydi, shuning uchun uni alohida serverga qo'yish yoki haqiqiy backend'ga o'tish kerak.

### 10.5 [Middle] Build Windows'da ishlab, Linux CI'da yiqilishi mumkinmi? Loyihada shunday joy bormi?

```jsx
// components/Map.jsx:13
import { useGeolocation } from "../hooks/useGeoLocation";   // katta "L"
// fayl nomi: src/hooks/useGeolocation.js                    // kichik "l"
```

**Javob:** Bor. Windows fayl tizimi katta-kichik harfni farqlamaydi, shuning uchun bu import lokal ishlaydi. Netlify va Vercel build serverlari esa Linux'da ishlaydi, u yerda build `Could not resolve "../hooks/useGeoLocation"` kabi xato bilan to'xtaydi. Tuzatish uchun import'ni fayl nomiga moslash yetarli. Shuning uchun build'ni Linux CI'da (masalan, Ubuntu'dagi GitHub Actions'da) tekshirib turish foydali.

---

## 11. Kodimdagi kamchiliklar va yaxshilash yo'llari

> Bu yerdagi hamma narsa joriy kodda bor. Qator raqamlari `src/` ning hozirgi holatiga mos.

### 11.1 Funksional bug'lar

| # | Fayl:qator | Muammo | Yechim |
|---|---|---|---|
| 1 | `contexts/CitiesContext.jsx:30-34` | `"city/loaded"` case'i `isLoading: false` qo'ymaydi. `getCity` avval `"loading"` dispatch qiladi (`:92`), shundan keyin `isLoading` `true` holida qolib ketadi. Natijada `City` sahifasida (`City.jsx:25`), keyin esa `CityList` da ham spinner to'xtamaydi. | `return { ...state, isLoading: false, currentCity: action.payload };` |
| 2 | `contexts/CitiesContext.jsx:91` | `Number(id) === currentCity.id`: json-server id'lari string (`"m9k4pQFFBak"`), `Number(...)` esa `NaN` beradi, shuning uchun shart hech qachon bajarilmaydi. Cache ishlamaydi va shahar har safar qayta fetch qilinadi. | `if (id === currentCity.id) return;` (ikkalasi ham string) |
| 3 | `App.jsx:39` + `components/CityItem.jsx:27` | Index route `CityList` ni render qiladi. `CityItem` dagi relative link (`` `${id}?lat=...` ``) index route ichida `/app/:id` ga resolve bo'ladi, bunday route esa yo'q, natijada `PageNotFound` chiqadi. `/app/cities` dan bosilganda ishlaydi, `/app` dan bosilganda ishlamaydi. Qo'shimcha muammo: `/app` da "Cities" `NavLink` active bo'lmaydi. | `<Route index element={<Navigate replace to="cities" />} />` |
| 4 | `components/CountryList.jsx:27` | `key={country.id}`: obyektda `id` yo'q, shuning uchun key `undefined` bo'ladi. React "unique key" ogohlantirishini beradi. | `key={country.country}` |
| 5 | `pages/Login.jsx:17` | `if (email && login)`: `password` o'rniga `login` funksiyasi tekshirilyapti, u esa doim truthy. | `if (email && password) login(email, password);` |
| 6 | `contexts/FakeAuthContext.jsx:36-39` | Parol noto'g'ri bo'lsa, hech narsa bo'lmaydi: na xato state, na xabar bor. | `"login/failed"` action va `error` state qo'shib, xabarni Login sahifasida ko'rsatish. |
| 7 | `contexts/CitiesContext.jsx:76-77`, `:95-96`, `:111-118` | `res.ok` tekshirilmaydi, shuning uchun 404/500 javoblari ham muvaffaqiyat deb qabul qilinadi. | `if (!res.ok) throw new Error(...)` |
| 8 | `contexts/CitiesContext.jsx:50-55` | `error` state'ga yoziladi, lekin uni hech qaysi komponent o'qimaydi. Muvaffaqiyatli request'dan keyin u tozalanmaydi ham. | `error` ni `CityList`/`City` da ko'rsatish; `"loading"` case'ida `error: ""` qilish. |
| 9 | `components/Form.jsx:37-60` | Geocoding request'i bekor qilinmaydi, shuning uchun tez bosilganda race condition yuz beradi. | `AbortController` + effect cleanup. |
| 10 | `components/Form.jsx:72` | `lat`/`lng` URL'dan string bo'lib keladi va shu holida saqlanadi (`data/cities.json` da `"lat": "50.0077..."`). | `position: { lat: Number(lat), lng: Number(lng) }` |
| 11 | `components/Map.jsx:20-24` | `useGeolocation` `error` qaytaradi, lekin `Map` uni olmaydi: foydalanuvchi geolokatsiyani rad etsa, hech qanday xabar ko'rmaydi. | `error` ni destructure qilib, `Message` bilan ko'rsatish. |

### 11.2 Deploy'ni buzadigan joylar

| # | Fayl:qator | Muammo | Yechim |
|---|---|---|---|
| 12 | `components/Map.jsx:13` | Import yo'li `"../hooks/useGeoLocation"`, fayl nomi esa `useGeolocation.js`. Linux'da build yiqiladi. | Import'ni `"../hooks/useGeolocation"` ga to'g'rilash. |
| 13 | `contexts/CitiesContext.jsx:9` | `BASE_URL` `localhost:9000` ga hardcode qilingan. | `import.meta.env.VITE_API_URL` |
| 14 | `public/` | SPA fallback yo'q (`_redirects` yoki `vercel.json`), shuning uchun nested URL'da sahifa yangilansa 404 chiqadi. | `public/_redirects` fayliga: `/*  /index.html  200` |
| 15 | `package.json` | `json-server` `dependencies` da turibdi, holbuki u faqat development'da kerak. `date-picker` paketi esa umuman import qilinmagan. | `json-server` ni `devDependencies` ga ko'chirish, `date-picker` ni o'chirish. |

### 11.3 Arxitektura va React pattern'lari

| # | Fayl:qator | Muammo | Yechim |
|---|---|---|---|
| 16 | `pages/ProtectedRoute.jsx:8-11` | Redirect `useEffect` orqali va `replace` siz qilinadi: `/login` dan Back bosilsa, foydalanuvchi `/app` ga qaytadi va yana redirect bo'ladi. | `return isAuth ? children : <Navigate to="/login" replace />;` |
| 17 | `components/City.jsx:21-23` | `useEffect` dependency'sida `getCity` yo'q (ESLint `exhaustive-deps`). | `[id, getCity]`; buni #2 bilan birga tuzatish kerak, aks holda ortiqcha fetch bo'ladi. |
| 18 | `components/Map.jsx:74-78` | `map.setView` render paytida chaqiriladi, ya'ni render ichida side effect bor. | `useEffect(() => { map.setView(position); }, [map, position]);` |
| 19 | `components/Map.jsx:28-35` | Effect ichida sinxron `setState` chaqiriladi (ESLint `set-state-in-effect` xatosi), bu qo'shimcha render beradi. | Pozitsiyani URL'dan derive qilish, geolokatsiya natijasini `setSearchParams` bilan URL'ga yozish. |
| 20 | `contexts/CitiesContext.jsx:145-154` | Context `value` har render'da yangi obyekt bo'ladi; `createCity`/`deleteCity` memo qilinmagan. | `useMemo` + `useCallback` yoki state va funksiyalarni alohida context'larga bo'lish. |
| 21 | `App.jsx:23-25` | `CitiesProvider` butun ilovani o'raydi, shuning uchun shaharlar Homepage'da, login'dan oldin fetch qilinadi. | Provider'ni faqat `/app` route'idagi `AppLayout` atrofiga ko'chirish. |
| 22 | `App.jsx:3-6` | `CityList`, `CountryList`, `City`, `Form` eager import qilingan, natijada `react-datepicker` (JS + CSS) asosiy chunk'ga tushadi (`index` ~445 kB). | Ularni ham `lazy` qilish. |
| 23 | `components/Button.jsx:3-5` | `type` prop'i HTML `type` ni emas, stil variantini bildiradi. Natijada formadagi har bir tugma `submit` bo'ladi va `BackButton` `preventDefault` ga majbur. | Prop'ni `variant` deb qayta nomlash va HTML `type` ni alohida uzatish. |
| 24 | `components/CityItem.jsx:25-35` | `<button>` `<a>` ichida joylashgan: bu noto'g'ri HTML va accessibility muammosi. | Tugmani `Link` dan tashqariga chiqarish. |
| 25 | `contexts/FakeAuthContext.jsx:27-32` | Auth faqat xotirada saqlanadi, shuning uchun sahifa yangilansa logout bo'ladi. Parol client bundle'ga tushadi. | Demo uchun normal holat. Haqiqiy auth'da token/httpOnly cookie va server tomonida tekshiruv kerak. |
| 26 | `pages/Login.jsx:21` | Effect'dan `return navigate(...)` qilinadi, holbuki effect faqat cleanup funksiya qaytarishi kerak. | `if (isAuth) navigate("/app", { replace: true });` |
| 27 | `index.css:2-3` | Leaflet CSS va font tashqi `@import` bilan ulangan: fayllar ketma-ket yuklanadi va loyiha CDN'ga bog'liq bo'lib qoladi. | `Map.jsx` da `import "leaflet/dist/leaflet.css"`, font uchun `index.html` da `<link>`. |
| 28 | `pages/Homepage.module.css:8` | `url("../bg.jpg")` build paytida resolve bo'lmaydi (Vite ogohlantirish beradi) va runtime'da tasodifan ishlaydi. | `url("/bg.jpg")`: `public/` dagi fayl uchun absolute path. |

### 11.4 Kod tozaligi

| # | Fayl:qator | Muammo |
|---|---|---|
| 29 | `components/CityItem.jsx:16`, `components/Map.jsx:54`, `components/Form.jsx:62` | Debug uchun yozilgan `console.log` lar qolib ketgan (`Map.jsx:54` da `// ← shuni qo'shing` izohi bilan). |
| 30 | `City.jsx:1, 3, 6, 20`, `Map.jsx:1, 3`, `Login.jsx:5`, `AppLayout.jsx:1-2`, `CitiesContext.jsx:1, 7`, `useUrlPosition.js:4` va bir qator komponentlardagi `import React` | Ishlatilmagan import va o'zgaruvchilar. `npm run lint` jami 29 ta muammo ko'rsatadi (28 error, 1 warning). |
| 31 | `components/City.jsx:9-15` va `components/CityItem.jsx:5-11` | `formatDate` ikki joyda takrorlangan; uni `utils/formatDate.js` ga chiqarish kerak. |
| 32 | `components/Form.jsx:16`, `contexts/CitiesContext.jsx:168`, `contexts/FakeAuthContext.jsx:57` | Komponent faylidan komponent bo'lmagan narsa ham export qilinadi, shuning uchun Fast Refresh to'liq ishlamaydi (`react-refresh/only-export-components`). `convertToEmoji` ni `utils/` ga, hook'larni alohida faylga ko'chirish kerak. |
| 33 | `components/Logo copy.jsx`, `Logo.module copy.css`, `AppNav.module copy.css`, `PageNav.module copy.css`, `src/App.css` (bo'sh), `src/assets/*` | Ishlatilmaydigan va nusxa fayllar. |
| 34 | `pages/Pricing.jsx:5` | Funksiya nomi `Product` qolib ketgan (copy-paste), React DevTools'da chalkashlik keltiradi. |
| 35 | `pages/Product.jsx:14` ("WorldWide"), `index.html:7` ("advantures"), `CityList.jsx:12` va `CountryList.jsx:13` ("...on the city" → "on the map") | Matndagi xatolar. |
| 36 | `README.md` | Vite shablonining matni turibdi. Portfolio uchun loyiha tavsifi, ishga tushirish yo'riqnomasi (`npm run server` + `npm run dev`) va screenshot kerak. |

### Intervyuda kamchiliklar haqida qanday gapirish kerak

Kamchilikni yashirmang, o'zingiz aytib o'ting. Intervyuer uchun bu "o'z kodiga tanqidiy qaray oladi" degan signal. 2–3 tasini tanlab, har biri haqida muammo → sabab → yechim tartibida gapiring. Masalan:

> "Loyihani qayta ko'rib chiqqanimda index route'da bug topdim: `/app` sahifasida shaharni bossam, relative link `/app/:id` ga olib boradi va 404 chiqadi. Sababi shundaki, index route parent'ning path'ini oladi. Yechim — index route'da `<Navigate replace to="cities" />` qilish. Ikkinchisi — context `value` har render'da yangi obyekt bo'ladi. Hozir bu sezilmaydi, lekin ilova kattalashsa, `useMemo` qilaman yoki context'ni ikkiga bo'laman. Uchinchisi — deploy: API manzili hardcode qilingan, SPA rewrite qoidasi esa yo'q."
