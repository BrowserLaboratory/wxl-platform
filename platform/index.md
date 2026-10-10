---
layout: home

hero:
  name: "WXL"
  text: "Web Exploitation Laboratory"
  tagline: Browser-based web exploitation challenge platform powered by WASM — no backend required, ready to run instantly
  image:
    light: /wxl-hero-light.svg
    dark: /wxl-hero-dark.svg
    alt: Web eXploitation Laboratory
  actions:
    - theme: brand
      text: Start Challenge
      link: /challenges/
    - theme: alt
      text: User Guide
      link: /guide/

features:
  - icon:
      src: /icons/browser.svg
      wrap: true
    title: Browser Emulator
    details: Built-in iframe sandbox for direct interaction with the challenge application
  - icon:
      src: /icons/code.svg
      wrap: true
    title: Code Editor (Pyodide)
    details: Python attack-script editor supporting the requests module and automated attacks
  - icon:
      src: /icons/repeater.svg
      wrap: true
    title: HTTP Repeater
    details: Intercept and replay HTTP requests, freely modifying parameters to probe vulnerabilities
  - icon:
      src: /icons/network.svg
      wrap: true
    title: Network Traffic Log
    details: Full HTTP request and response log for all tool panels, including status codes and timing
  - icon:
      src: /icons/notes.svg
      wrap: true
    title: Pentest Notes
    details: Markdown note system that records your operations and can export a full attack log
---

<script setup>
import { data } from './shared/challenges.data.ts'
</script>

<HomeContent :challenges="data" />
