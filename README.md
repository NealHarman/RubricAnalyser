# RubricAnalyser
Downloads and 'visualises' the contents of completed rubrics for assessments in the Canvas LMS

Written to help me work out what I needed to do to my Canvas rubrics to get the marks to conform to a more reasonable distribution. The issue is that I
like to write very quantative rubrics, with very clear descriptions of what is required for each criteria to reach a specific level. This meant (I
believed) that the marks were sometimes unrealstically high because it was very clear what was required.

The strategy was to simply download the assessment, grade and rubric data using the Canvas API (using Javascript and jQuery) and then turn it into
different kinds of charts (using D3) to get some insight into what was going on. I kept doing this until I got to one that was helpful and
then I stopped:-)

The code isn't by any means bug free (that is on my todo list but in practice - for me - it gave me the insight I needed). You will either need to
host this in the same domain as Canvas for your organisation, or use a browser with CORS turned off - e.g. for Chrome:
https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome

You will also need to be able to get a Canvas Authentication token for your Canvas instance.

For info, in my case, the view that showed 'what if' changes to rubric categories - moving grades in one or more categories up or down a band to see the
impact this had on marks overall - showed me a range of possible combinations of categories where moving down to the next lower category made the grades
conform to the 'target' curve much better. I was able to identify a combination where it was sensible to re-jig the rubric for future assignments by
adding a new top 'surprise me' category, reducing the grades for the existing ones. For me at least, problem solved.
