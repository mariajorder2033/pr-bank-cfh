# Android App

Native Android customer app in Kotlin + Jetpack Compose (Material 3), mirroring the customer web app and the shared design tokens (ui-ux-design.md §2, §7 "Mobile: Kotlin (Android)").

> **Not built in this cloud environment.** It needs the Android SDK, which isn't installed here, so it has not been compiled or run in CI. Open it in Android Studio (which installs the SDK and completes the Gradle sync) or build it on a machine with the SDK. The Kotlin was written against Compose BOM 2024.10 and AGP 8.7.

## What's here

| Area           | Files                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Theme          | `ui/theme/` — colours, type scale and light/dark scheme from the design tokens                    |
| Money & models | `data/Money.kt` (exact `BigDecimal`, Swiss formatting), `data/Models.kt`, `data/Iban.kt` (MOD-97) |
| Data layer     | `data/BankRepository.kt` (customer API) + `data/DemoBankRepository.kt` (in-memory demo)           |
| Screens        | `ui/screens/` — Login, Dashboard, Account detail, Transfer (with step-up), Cards                  |
| Navigation     | `nav/AppNav.kt` — bottom-nav Scaffold; `MainActivity.kt`                                          |
| Unit tests     | `app/src/test/` — money formatting and IBAN validation (JVM, run with `./gradlew test`)           |

## Demo mode

Like the web app, it ships a self-contained in-memory backend (`DemoBankRepository`): sign-in is simulated, data is seeded and resets on relaunch, own-account transfers move money immediately, and transfers over CHF 1,000 require a 6-digit step-up code (FR-12). Swap in HTTP-backed `BankRepository`/`AuthRepository` implementations (e.g. Retrofit) once the identity provider is chosen.

## Build

```sh
cd apps/android
./gradlew assembleDebug      # build the APK (requires the Android SDK)
./gradlew test               # run the JVM unit tests
```

If `local.properties` is missing, Android Studio creates it with `sdk.dir`; from the CLI, set `ANDROID_HOME` to your SDK location.

## Consistency with the web app

The colour values in `ui/theme/Color.kt` are the same hex as `packages/design-tokens`, and the money formatting, IBAN rules, transaction types, and step-up threshold match `packages/domain` and the web demo backend, so the two clients behave the same.
