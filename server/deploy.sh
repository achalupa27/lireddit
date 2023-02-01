#!/bin/bash

echo What should the version be?
read VERSION

#docker build -t achalupa27/algotut:$VERSION .
#docker push achalupa27/algotut:$VERSION
#ssh root@143.244.186.151 "docker pull achalupa27/algotut:$VERSION && docker tag achalupa27/algotut:$VERSION dokku/api:$VERSION && dokku deploy api $VERSION"