---
layout: post
title: "Using kramdown to enable LaTeX equations on Octopress"
date: 2013-01-07 19:23
comments: true
categories:
---
Following [these](http://www.idryman.org/blog/2012/03/10/writing-math-equations-on-octopress/) instructions I was able to get LaTeX equations interpreted and rendered correctly when posting to Octopress. It consists of installing the kramdown Markdown interpreter, updating the `_config.yml` and `Gemfile`, and putting the MathJax CDN and configs in `source/_layouts/default.html`.

For example, this block of code (taken from the aforementioned site):
{% codeblock lang:latex %}
$$
\begin{align}
\mbox{Union: } & A\cup B = \{x\mid x\in A \mbox{ or } x\in B\} \\
\mbox{Concatenation: } & A\circ B  = \{xy\mid x\in A \mbox{ and } y\in B\} \\
\mbox{Star: } & A^\star  = \{x_1x_2\ldots x_k \mid  k\geq 0 \mbox{ and each } x_i\in A\} \\
\end{align}
$$
{% endcodeblock %}

is translated into this:

$$
\begin{align}
\mbox{Union: } & A\cup B = \{x\mid x\in A \mbox{ or } x\in B\} \\
\mbox{Concatenation: } & A\circ B  = \{xy\mid x\in A \mbox{ and } y\in B\} \\
\mbox{Star: } & A^\star  = \{x_1x_2\ldots x_k \mid  k\geq 0 \mbox{ and each } x_i\in A\} \\
\end{align}.
$$

***QAPLA'!***
