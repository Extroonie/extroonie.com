---
title: 'A "quoted" title'
date: 2026-01-01
format: essay
tags: [programming, mathematics]
description: 'Mathematics, code, and notes in an essay.'
subtitle: 'A careful look at "math"'
abstract: A quoted abstract with a writer's apostrophe.
---
## Inline and block math

A "quoted" sentence and a writer's apostrophe. Inline \(E = mc^2\) and literal `"code"`.

\[
\begin{aligned}
 a^2 + b^2 &= c^2 \\
 \int_0^1 x^2\,dx &= \frac{1}{3}
\end{aligned}
\]

$$\begin{pmatrix}1 & 0 \\ 0 & 1\end{pmatrix}$$

{{< equation id="entropy" >}}
S = k_{\mathrm B}\ln\Omega
{{< /equation >}}

See {{< eqref "entropy" "equation (1)" >}}.

```js
const literal = "code";
```

## References

A footnote.[^source]

[^source]: Reference text.
