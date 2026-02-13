FROM node:24-alpine

ENV TZ="Europe/Budapest"
ENV APP_COMMAND="start:dev"

WORKDIR /app

COPY ./package*.json /app/
#
RUN npm install 
#
COPY ./ /app/

RUN chmod +x ./environment/application-start/application-start.sh

#
EXPOSE 3001
EXPOSE 9229

CMD sh ./environment/application-start/application-start.sh $APP_COMMAND


#CMD npm run $APP_COMMAND
