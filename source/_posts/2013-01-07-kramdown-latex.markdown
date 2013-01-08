---
layout: post
title: "Using Kramdown to Enable LaTeX Equations on Octopress"
date: 2013-01-07 19:23
comments: true
categories: LaTeX Kramdown MathJax Octopress Mathematics
---
Following [these](http://www.idryman.org/blog/2012/03/10/writing-math-equations-on-octopress/) instructions I was able to get $\LaTeX$ equations interpreted and rendered correctly when posting to Octopress. It consists of installing the kramdown Markdown interpreter, updating the `_config.yml` and `Gemfile`, and putting the MathJax CDN and configs in `source/_layouts/default.html`.

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

**EDIT:** I forgot to metion something that causes a little trouble when editing the `Gemfile`. When replacing `gem 'rdiscount'` with `gem 'kramdown'`, the version number after the `'~>'` needs to be replaced as well. At the time of writing putting the current version number (0.14.1) for kramdown causes an error when running `rake generate`:
<!--  -->
{% codeblock lang:bash %}
$ rake generate
You have requested:
  kramdown ~> 0.14.1

The bundle currently has kramdown locked at 0.13.8.
Try running `bundle update kramdown`
Run `bundle install` to install missing gems.
{% endcodeblock %}
<!--  -->
To fix this, replace `gem 'kramdown', '~> 0.14.1'`{:.language-ruby} with `gem 'kramdown', '~> 0.13.8'` in the `Gemfile`. Running `rake generate` is now successful:
<!--  -->
{% codeblock lang:bash %}
$ rake generate
## Generating Site with Jekyll
unchanged sass/screen.scss
Configuration from /path/to/Octopress/_config.yml
Building site: source -> public
Successfully generated site: source -> public
{% endcodeblock %}
<!--  -->
